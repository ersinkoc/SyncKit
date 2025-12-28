import type {
  SyncKit,
  KernelOptions,
  Operation,
  OperationInput,
  PushResult,
  QueueStatus,
  SyncResult,
  Plugin,
  PluginInfo,
  EventType,
  EventHandler,
  Unsubscribe,
  KernelEvent,
  StorageAdapter,
} from '../types'
import { EventBus } from './event-bus'
import { PluginRegistry } from './plugin-registry'
import { generateId } from '../utils/uid'

/**
 * Default kernel options.
 */
const DEFAULT_OPTIONS: Partial<KernelOptions> = {
  conflictStrategy: 'last-write-wins',
  autoSync: true,
  syncInterval: 0,
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: false,
    jitterFactor: 0.1,
  },
}

/**
 * SyncKit Kernel - micro-kernel implementation.
 * Coordinates plugins and delegates most work to them.
 */
export class SyncKitKernel<TPayload = unknown, TResult = unknown>
  implements SyncKit<TPayload, TResult>
{
  private eventBus: EventBus
  private pluginRegistry: PluginRegistry
  private options: KernelOptions<TPayload, TResult>
  private initialized: boolean = false
  private paused: boolean = false
  private online: boolean = true
  private syncIntervalTimer: number | null = null
  private currentlyProcessing: boolean = false

  constructor(options: KernelOptions<TPayload, TResult>) {
    this.options = this.mergeOptions(options)
    this.eventBus = new EventBus()
    this.pluginRegistry = new PluginRegistry(this)
  }

  // ===== Lifecycle =====

  async init(): Promise<void> {
    if (this.initialized) {
      throw new Error('Kernel already initialized')
    }

    // Register core plugins first (they'll be auto-registered by factory)
    // Then register user plugins
    if (this.options.plugins) {
      for (const plugin of this.options.plugins) {
        await this.register(plugin)
      }
    }

    // Load queue from storage
    const storage = await this.getStorageAdapter()
    await storage.init()

    const operations = await storage.getAll()
    const queueManager = this.getQueueManagerPlugin()

    // Restore operations to queue
    for (const op of operations) {
      queueManager.api.enqueue(op)
    }

    // Set up network monitoring
    const networkMonitor = this.getNetworkMonitorPlugin()
    this.online = networkMonitor.api.isOnline()

    // Subscribe to network events
    this.on('online', () => {
      this.online = true
      if (this.options.autoSync && !this.paused) {
        this.sync()
      }
    })

    this.on('offline', () => {
      this.online = false
    })

    // Start sync interval if configured
    if (this.options.syncInterval && this.options.syncInterval > 0) {
      this.syncIntervalTimer = window.setInterval(() => {
        if (this.online && !this.paused) {
          this.sync()
        }
      }, this.options.syncInterval)
    }

    this.initialized = true

    // Auto-sync if online
    if (this.online && this.options.autoSync) {
      this.sync()
    }
  }

  async destroy(): Promise<void> {
    // Stop sync interval
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer)
      this.syncIntervalTimer = null
    }

    // Unregister all plugins
    await this.pluginRegistry.clear()

    // Close storage
    const storage = await this.getStorageAdapter()
    await storage.close()

    // Clear event bus
    this.eventBus.clear()

    this.initialized = false
  }

  // ===== Queue Operations =====

  push(operation: OperationInput<TPayload>): PushResult {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()

    // Run beforePush hooks
    let modifiedOp = operation
    const plugins = Array.from(this.pluginRegistry.listPlugins())

    for (const pluginInfo of plugins) {
      const plugin = this.pluginRegistry.getPlugin(pluginInfo.name)
      if (plugin?.hooks?.beforePush) {
        const result = plugin.hooks.beforePush(modifiedOp)
        if (result === false) {
          // Hook rejected operation
          throw new Error(`Operation rejected by plugin '${plugin.name}'`)
        }
        if (result) {
          modifiedOp = result as OperationInput<TPayload>
        }
      }
    }

    // Create operation
    const op: Operation<TPayload> = {
      id: modifiedOp.id || generateId('op'),
      resource: modifiedOp.resource,
      method: modifiedOp.method,
      payload: modifiedOp.payload,
      priority: modifiedOp.priority || 'normal',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attempts: 0,
      lastAttempt: null,
      lastError: null,
      batchId: null,
      metadata: modifiedOp.metadata || {},
    }

    // Add to queue
    queueManager.api.enqueue(op)

    // Persist
    this.persistQueue()

    // Store callbacks in metadata for later
    if (modifiedOp.onSuccess) {
      op.metadata.__onSuccess = modifiedOp.onSuccess as any
    }
    if (modifiedOp.onError) {
      op.metadata.__onError = modifiedOp.onError as any
    }

    // Run afterPush hooks
    for (const pluginInfo of plugins) {
      const plugin = this.pluginRegistry.getPlugin(pluginInfo.name)
      if (plugin?.hooks?.afterPush) {
        plugin.hooks.afterPush(op)
      }
    }

    // Emit push event
    this.emit({
      type: 'push',
      timestamp: Date.now(),
      operation: op,
      optimistic: modifiedOp.optimistic || false,
    })

    // Trigger sync if online and not paused
    if (this.online && !this.paused && this.options.autoSync) {
      // Async, don't await
      this.sync()
    }

    // Return result
    const optimisticId = modifiedOp.optimistic ? generateId('opt') : null

    return {
      operationId: op.id,
      optimisticId,
      rollback: () => {
        // Remove from queue
        this.remove(op.id)
      },
    }
  }

  remove(operationId: string): boolean {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()
    const removed = queueManager.api.remove(operationId)

    if (removed) {
      this.persistQueue()
      this.emit({
        type: 'remove',
        timestamp: Date.now(),
        operationId,
      })
    }

    return removed
  }

  clear(): void {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()
    queueManager.api.clear()

    this.persistQueue()

    this.emit({
      type: 'clear',
      timestamp: Date.now(),
    })
  }

  getQueue(): Operation<TPayload>[] {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()
    return queueManager.api.getAll()
  }

  getOperation(id: string): Operation<TPayload> | undefined {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()
    return queueManager.api.getAll().find((op) => op.id === id)
  }

  // ===== Queue Status =====

  getStatus(): QueueStatus {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()
    const counts = queueManager.api.countByStatus()

    return {
      pending: counts.pending || 0,
      syncing: counts.syncing || 0,
      failed: counts.failed || 0,
      total: queueManager.api.count(),
      isProcessing: this.currentlyProcessing,
      isPaused: this.paused,
      isOnline: this.online,
    }
  }

  isPending(operationId: string): boolean {
    const op = this.getOperation(operationId)
    return op?.status === 'pending'
  }

  // ===== Sync Control =====

  async sync(): Promise<SyncResult<TResult>[]> {
    this.ensureInitialized()

    if (this.paused) {
      return []
    }

    if (!this.online) {
      return []
    }

    if (this.currentlyProcessing) {
      // Already processing, skip
      return []
    }

    this.currentlyProcessing = true

    const results: SyncResult<TResult>[] = []
    const queueManager = this.getQueueManagerPlugin()

    // Get pending operations (sorted by priority)
    const pending = queueManager.api.getByStatus('pending')

    for (const op of pending) {
      const result = await this.syncOperation(op)
      results.push(result)

      // If failed and should stop on failure
      if (!result.success) {
        // Continue for now, retry engine will handle retries
      }
    }

    this.currentlyProcessing = false

    return results
  }

  pause(): void {
    this.paused = true
    this.emit({
      type: 'pause',
      timestamp: Date.now(),
    })
  }

  resume(): void {
    this.paused = false
    this.emit({
      type: 'resume',
      timestamp: Date.now(),
    })

    // Trigger sync if online
    if (this.online && this.options.autoSync) {
      this.sync()
    }
  }

  isPaused(): boolean {
    return this.paused
  }

  async retry(operationId: string): Promise<SyncResult<TResult>> {
    this.ensureInitialized()

    const op = this.getOperation(operationId)
    if (!op) {
      throw new Error(`Operation '${operationId}' not found`)
    }

    return this.syncOperation(op)
  }

  async retryAll(): Promise<SyncResult<TResult>[]> {
    this.ensureInitialized()

    const queueManager = this.getQueueManagerPlugin()
    const failed = queueManager.api.getByStatus('failed')

    const results: SyncResult<TResult>[] = []
    for (const op of failed) {
      const result = await this.syncOperation(op)
      results.push(result)
    }

    return results
  }

  // ===== Network Status =====

  isOnline(): boolean {
    return this.online
  }

  setOnline(online: boolean): void {
    const wasOnline = this.online
    this.online = online

    if (online && !wasOnline) {
      this.emit({ type: 'online', timestamp: Date.now() })
    } else if (!online && wasOnline) {
      this.emit({ type: 'offline', timestamp: Date.now() })
    }
  }

  // ===== Batch Operations =====

  batch(batchId: string, operations: OperationInput<TPayload>[]): string {
    this.ensureInitialized()

    for (const op of operations) {
      const result = this.push(op)
      // Update operation with batchId
      const operation = this.getOperation(result.operationId)
      if (operation) {
        operation.batchId = batchId
      }
    }

    return batchId
  }

  // ===== Plugin Management =====

  async register(plugin: Plugin): Promise<void> {
    await this.pluginRegistry.register(plugin)
  }

  async unregister(pluginName: string): Promise<void> {
    await this.pluginRegistry.unregister(pluginName)
  }

  getPlugin<P extends Plugin>(name: string): P | undefined {
    return this.pluginRegistry.getPlugin<P>(name)
  }

  listPlugins(): PluginInfo[] {
    return this.pluginRegistry.listPlugins()
  }

  // ===== Event System =====

  on<E extends EventType>(eventType: E, handler: EventHandler<E>): Unsubscribe {
    return this.eventBus.on(eventType, handler)
  }

  onAny(handler: (event: KernelEvent) => void): Unsubscribe {
    return this.eventBus.onAny(handler)
  }

  off<E extends EventType>(eventType: E, handler: EventHandler<E>): void {
    this.eventBus.off(eventType, handler)
  }

  emit(event: KernelEvent): void {
    this.eventBus.emit(event)
  }

  // ===== Configuration =====

  configure(options: Partial<KernelOptions<TPayload, TResult>>): void {
    this.options = this.mergeOptions({ ...this.options, ...options })
  }

  getOptions(): KernelOptions<TPayload, TResult> {
    return { ...this.options }
  }

  // ===== Private Methods =====

  /**
   * Sync a single operation.
   * @private
   */
  private async syncOperation(op: Operation<TPayload>): Promise<SyncResult<TResult>> {
    const startTime = Date.now()

    // Update status
    op.status = 'syncing'
    op.updatedAt = Date.now()
    this.persistQueue()

    // Emit sync-start
    this.emit({
      type: 'sync-start',
      timestamp: Date.now(),
      operation: op,
    })

    // Run beforeSync hooks
    const plugins = Array.from(this.pluginRegistry.listPlugins())
    for (const pluginInfo of plugins) {
      const plugin = this.pluginRegistry.getPlugin(pluginInfo.name)
      if (plugin?.hooks?.beforeSync) {
        const shouldContinue = await plugin.hooks.beforeSync(op)
        if (!shouldContinue) {
          // Hook cancelled sync
          op.status = 'cancelled'
          this.persistQueue()
          return {
            operationId: op.id,
            success: false,
            result: null,
            error: new Error('Sync cancelled by plugin'),
            duration: Date.now() - startTime,
            attempts: op.attempts,
            conflict: false,
            conflictResolution: null,
          }
        }
      }
    }

    try {
      // Execute
      const result = await this.options.executor(op)

      // Success
      op.status = 'success'
      op.updatedAt = Date.now()
      op.attempts++
      op.lastAttempt = Date.now()

      // Remove from queue
      const queueManager = this.getQueueManagerPlugin()
      queueManager.api.remove(op.id)
      this.persistQueue()

      // Call onSuccess callback if provided
      const onSuccess = op.metadata.__onSuccess as ((result: unknown) => void) | undefined
      if (onSuccess) {
        try {
          onSuccess(result)
        } catch (error) {
          console.error('Error in onSuccess callback:', error)
        }
      }

      // Run afterSync hooks
      const syncResult: SyncResult<TResult> = {
        operationId: op.id,
        success: true,
        result,
        error: null,
        duration: Date.now() - startTime,
        attempts: op.attempts,
        conflict: false,
        conflictResolution: null,
      }

      for (const pluginInfo of plugins) {
        const plugin = this.pluginRegistry.getPlugin(pluginInfo.name)
        if (plugin?.hooks?.afterSync) {
          await plugin.hooks.afterSync(op, syncResult)
        }
      }

      // Emit sync-success
      this.emit({
        type: 'sync-success',
        timestamp: Date.now(),
        operation: op,
        result,
        duration: Date.now() - startTime,
      })

      return syncResult
    } catch (error) {
      // Failure
      op.status = 'failed'
      op.updatedAt = Date.now()
      op.attempts++
      op.lastAttempt = Date.now()
      op.lastError = (error as Error).message
      this.persistQueue()

      // Call onError callback if provided
      const onError = op.metadata.__onError as ((error: Error) => void) | undefined
      if (onError) {
        try {
          onError(error as Error)
        } catch (err) {
          console.error('Error in onError callback:', err)
        }
      }

      const syncResult: SyncResult<TResult> = {
        operationId: op.id,
        success: false,
        result: null,
        error: error as Error,
        duration: Date.now() - startTime,
        attempts: op.attempts,
        conflict: false,
        conflictResolution: null,
      }

      // Run afterSync hooks (retry engine will schedule retry here)
      for (const pluginInfo of plugins) {
        const plugin = this.pluginRegistry.getPlugin(pluginInfo.name)
        if (plugin?.hooks?.afterSync) {
          await plugin.hooks.afterSync(op, syncResult)
        }
      }

      // Emit sync-error
      this.emit({
        type: 'sync-error',
        timestamp: Date.now(),
        operation: op,
        error: error as Error,
        willRetry: op.attempts < (this.options.retry?.maxAttempts || 5),
        attempt: op.attempts,
      })

      return syncResult
    }
  }

  /**
   * Persist queue to storage.
   * @private
   */
  private async persistQueue(): Promise<void> {
    try {
      const queueManager = this.getQueueManagerPlugin()
      const operations = queueManager.api.getAll()
      const storage = await this.getStorageAdapter()
      await storage.setAll(operations)
    } catch (error) {
      console.error('Error persisting queue:', error)
    }
  }

  /**
   * Get storage adapter (from plugin or built-in).
   * @private
   */
  private async getStorageAdapter(): Promise<StorageAdapter> {
    if (typeof this.options.storage === 'string') {
      // Built-in storage
      if (this.options.storage === 'indexeddb') {
        const plugin = this.getPlugin('storage-indexeddb')
        if (!plugin || !plugin.api) {
          throw new Error('IndexedDB storage plugin not registered')
        }
        return plugin.api as StorageAdapter
      } else if (this.options.storage === 'localstorage') {
        const plugin = this.getPlugin('storage-localstorage')
        if (!plugin || !plugin.api) {
          throw new Error('LocalStorage storage plugin not registered')
        }
        return plugin.api as StorageAdapter
      } else {
        throw new Error(`Unknown storage type: ${this.options.storage}`)
      }
    } else {
      // Custom storage adapter
      return this.options.storage
    }
  }

  /**
   * Get queue manager plugin (required).
   * @private
   */
  private getQueueManagerPlugin(): any {
    const plugin = this.getPlugin('queue-manager')
    if (!plugin || !plugin.api) {
      throw new Error('Queue manager plugin not registered')
    }
    return plugin
  }

  /**
   * Get network monitor plugin (required).
   * @private
   */
  private getNetworkMonitorPlugin(): any {
    const plugin = this.getPlugin('network-monitor')
    if (!plugin || !plugin.api) {
      throw new Error('Network monitor plugin not registered')
    }
    return plugin
  }

  /**
   * Ensure kernel is initialized.
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Kernel not initialized. Call init() first.')
    }
  }

  /**
   * Merge options with defaults.
   * @private
   */
  private mergeOptions(
    options: KernelOptions<TPayload, TResult>
  ): KernelOptions<TPayload, TResult> {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
      retry: {
        ...DEFAULT_OPTIONS.retry,
        ...options.retry,
      },
    } as KernelOptions<TPayload, TResult>
  }
}
