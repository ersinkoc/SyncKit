import type { Plugin, SyncKit, Operation, SyncResult } from '../../types'

/**
 * Batching options.
 */
export interface BatchingOptions {
  /**
   * Maximum number of operations per batch.
   * @default 10
   */
  maxBatchSize?: number

  /**
   * Maximum time window to wait for batching (ms).
   * @default 1000
   */
  batchWindow?: number

  /**
   * Group operations by resource.
   * @default true
   */
  groupByResource?: boolean

  /**
   * Custom batch executor function.
   * If not provided, operations will be executed individually.
   */
  batchExecutor?: (operations: Operation[]) => Promise<unknown[]>

  /**
   * Error handling strategy:
   * - 'all-or-nothing': If any operation fails, all fail
   * - 'partial': Continue even if some operations fail
   * @default 'partial'
   */
  errorStrategy?: 'all-or-nothing' | 'partial'
}

/**
 * Batching API exposed to users.
 */
export interface BatchingAPI {
  /**
   * Manually flush all pending batches.
   */
  flush(): Promise<void>

  /**
   * Get pending batch count.
   */
  getPendingBatchCount(): number
}

/**
 * Batching Plugin - groups operations into batches.
 * Optional plugin (user must register manually).
 */
export class BatchingPlugin implements Plugin {
  name = 'batching'
  version = '1.0.0'
  type = 'optional' as const

  private kernel?: SyncKit
  private options: Required<BatchingOptions>
  private pendingBatches: Map<string, Operation[]> = new Map()
  private batchTimers: Map<string, number> = new Map()
  api!: BatchingAPI

  constructor(options: BatchingOptions = {}) {
    this.options = {
      maxBatchSize: options.maxBatchSize || 10,
      batchWindow: options.batchWindow || 1000,
      groupByResource: options.groupByResource ?? true,
      batchExecutor: options.batchExecutor || this.defaultBatchExecutor.bind(this),
      errorStrategy: options.errorStrategy || 'partial',
    }
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Expose API
    this.api = {
      flush: this.flush.bind(this),
      getPendingBatchCount: this.getPendingBatchCount.bind(this),
    }
  }

  async uninstall(): Promise<void> {
    // Flush pending batches before uninstalling
    await this.flush()
  }

  /**
   * Plugin hooks.
   */
  hooks = {
    /**
     * Before sync - intercept and batch operations.
     */
    beforeSync: async (operation: Operation): Promise<boolean> => {
      // Add to batch
      this.addToBatch(operation)

      // Return false to prevent immediate sync (batching will handle it)
      return false
    },
  }

  /**
   * Add operation to batch.
   * @private
   */
  private addToBatch(operation: Operation): void {
    // Determine batch key
    const batchKey = this.options.groupByResource ? operation.resource : 'default'

    // Get or create batch
    if (!this.pendingBatches.has(batchKey)) {
      this.pendingBatches.set(batchKey, [])
    }

    const batch = this.pendingBatches.get(batchKey)!
    batch.push(operation)

    // Check if batch is full
    if (batch.length >= this.options.maxBatchSize) {
      this.executeBatch(batchKey)
      return
    }

    // Schedule batch execution
    this.scheduleBatch(batchKey)
  }

  /**
   * Schedule batch execution after time window.
   * @private
   */
  private scheduleBatch(batchKey: string): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(batchKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Schedule new timer
    const timer = window.setTimeout(() => {
      this.executeBatch(batchKey)
    }, this.options.batchWindow)

    this.batchTimers.set(batchKey, timer)
  }

  /**
   * Execute a batch.
   * @private
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.pendingBatches.get(batchKey)
    if (!batch || batch.length === 0) {
      return
    }

    // Clear timer and batch
    const timer = this.batchTimers.get(batchKey)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(batchKey)
    }
    this.pendingBatches.delete(batchKey)

    if (!this.kernel) {
      return
    }

    try {
      // Execute batch
      const results = await this.options.batchExecutor(batch)

      // Handle results
      const syncResults: SyncResult[] = []

      if (this.options.errorStrategy === 'all-or-nothing') {
        // Mark all as success
        for (const operation of batch) {
          const syncResult: SyncResult = {
            operationId: operation.id,
            success: true,
            result: results,
            error: null,
            duration: 0,
            attempts: operation.attempts,
            conflict: false,
            conflictResolution: null,
          }
          syncResults.push(syncResult)

          this.kernel.emit({
            type: 'sync-success',
            timestamp: Date.now(),
            operation,
            result: results,
            duration: 0,
          })
        }
      } else {
        // Partial: handle individual results
        for (let i = 0; i < batch.length; i++) {
          const operation = batch[i]
          const result = results[i]

          if (!operation) continue

          if (result instanceof Error) {
            const syncResult: SyncResult = {
              operationId: operation.id,
              success: false,
              result: null,
              error: result,
              duration: 0,
              attempts: operation.attempts,
              conflict: false,
              conflictResolution: null,
            }
            syncResults.push(syncResult)

            this.kernel.emit({
              type: 'sync-error',
              timestamp: Date.now(),
              operation,
              error: result,
              willRetry: false,
              attempt: operation.attempts,
            })
          } else {
            const syncResult: SyncResult = {
              operationId: operation.id,
              success: true,
              result,
              error: null,
              duration: 0,
              attempts: operation.attempts,
              conflict: false,
              conflictResolution: null,
            }
            syncResults.push(syncResult)

            this.kernel.emit({
              type: 'sync-success',
              timestamp: Date.now(),
              operation,
              result,
              duration: 0,
            })
          }
        }
      }

      // Emit batch complete event
      this.kernel.emit({
        type: 'batch-complete',
        timestamp: Date.now(),
        batchId: batchKey,
        results: syncResults,
        allSuccessful: syncResults.every((r) => r.success),
      })
    } catch (error) {
      // Batch failed
      for (const operation of batch) {
        this.kernel.emit({
          type: 'sync-error',
          timestamp: Date.now(),
          operation,
          error: error as Error,
          willRetry: false,
          attempt: operation.attempts,
        })
      }
    }
  }

  /**
   * Default batch executor - executes operations individually.
   * Users should provide custom batchExecutor for actual batching.
   * @private
   */
  private async defaultBatchExecutor(operations: Operation[]): Promise<unknown[]> {
    if (!this.kernel) {
      throw new Error('Kernel not initialized')
    }

    const results: unknown[] = []

    for (const operation of operations) {
      try {
        // Execute via kernel's retry method (which will trigger sync)
        const result = await this.kernel.retry(operation.id)
        results.push(result.result)
      } catch (error) {
        if (this.options.errorStrategy === 'all-or-nothing') {
          throw error
        }
        results.push(error)
      }
    }

    return results
  }

  /**
   * Flush all pending batches.
   * @private
   */
  private async flush(): Promise<void> {
    const batchKeys = Array.from(this.pendingBatches.keys())

    for (const key of batchKeys) {
      await this.executeBatch(key)
    }
  }

  /**
   * Get pending batch count.
   * @private
   */
  private getPendingBatchCount(): number {
    let count = 0
    for (const batch of this.pendingBatches.values()) {
      count += batch.length
    }
    return count
  }
}

/**
 * Create batching plugin instance.
 */
export function batchingPlugin(options?: BatchingOptions): BatchingPlugin {
  return new BatchingPlugin(options)
}
