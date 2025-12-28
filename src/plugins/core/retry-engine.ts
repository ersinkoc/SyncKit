import type { Plugin, SyncKit, Operation, SyncResult, RetryOptions } from '../../types'
import { calculateBackoff } from '../../utils/backoff'

/**
 * Retry Engine API exposed to users.
 */
export interface RetryEngineAPI {
  scheduleRetry(operation: Operation): void
  cancelRetry(operationId: string): void
  cancelAllRetries(): void
  getRetryTime(operationId: string): number | null
  getRetryAttempt(operationId: string): number
}

/**
 * Retry Engine Plugin - automatic retry with backoff strategies.
 * Core plugin (always loaded).
 */
export class RetryEnginePlugin implements Plugin {
  name = 'retry-engine'
  version = '1.0.0'
  type = 'core' as const

  private kernel?: SyncKit
  private retryTimers: Map<string, number> = new Map()
  private retryTimes: Map<string, number> = new Map()
  private options: Omit<Required<RetryOptions>, 'retryOn'> & Pick<RetryOptions, 'retryOn'>
  api!: RetryEngineAPI

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxAttempts: options.maxAttempts || 5,
      backoff: options.backoff || 'exponential',
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      jitter: options.jitter ?? false,
      jitterFactor: options.jitterFactor || 0.1,
      retryOn: options.retryOn,
    }
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Expose API
    this.api = {
      scheduleRetry: this.scheduleRetry.bind(this),
      cancelRetry: this.cancelRetry.bind(this),
      cancelAllRetries: this.cancelAllRetries.bind(this),
      getRetryTime: this.getRetryTime.bind(this),
      getRetryAttempt: this.getRetryAttempt.bind(this),
    }
  }

  uninstall(): void {
    this.cancelAllRetries()
  }

  /**
   * Plugin hooks.
   */
  hooks = {
    /**
     * After sync completes (success or failure).
     * Schedule retry if needed.
     */
    afterSync: (operation: Operation, result: SyncResult) => {
      if (!result.success && this.shouldRetry(operation, result.error!)) {
        this.scheduleRetry(operation)
      }
    },
  }

  /**
   * Check if operation should be retried.
   * @private
   */
  private shouldRetry(operation: Operation, error: Error): boolean {
    // Check max attempts
    if (operation.attempts >= this.options.maxAttempts) {
      return false
    }

    // Custom retry condition
    if (this.options.retryOn) {
      return this.options.retryOn(error)
    }

    // Default: retry on network errors, not on 4xx client errors
    const errorMessage = error.message.toLowerCase()

    // Don't retry on client errors (400-499)
    if (
      errorMessage.includes('400') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('404') ||
      errorMessage.includes('422')
    ) {
      return false
    }

    // Retry on network errors and 5xx server errors
    return true
  }

  /**
   * Schedule a retry for an operation.
   * @private
   */
  private scheduleRetry(operation: Operation): void {
    const attempt = operation.attempts + 1

    // Calculate delay
    const delay = calculateBackoff(
      attempt,
      this.options.baseDelay,
      this.options.maxDelay,
      this.options.backoff,
      this.options.jitter,
      this.options.jitterFactor
    )

    // Cancel existing retry if any
    this.cancelRetry(operation.id)

    // Schedule retry
    const retryTime = Date.now() + delay
    this.retryTimes.set(operation.id, retryTime)

    const timer = window.setTimeout(() => {
      this.retryTimers.delete(operation.id)
      this.retryTimes.delete(operation.id)

      // Trigger retry
      if (this.kernel) {
        this.kernel.retry(operation.id).catch((error) => {
          console.error(`Error retrying operation ${operation.id}:`, error)
        })
      }
    }, delay)

    this.retryTimers.set(operation.id, timer)

    // Emit retry event
    if (this.kernel) {
      this.kernel.emit({
        type: 'retry',
        timestamp: Date.now(),
        operation,
        attempt,
        nextRetryAt: retryTime,
      })
    }
  }

  /**
   * Cancel retry for an operation.
   * @private
   */
  private cancelRetry(operationId: string): void {
    const timer = this.retryTimers.get(operationId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(operationId)
      this.retryTimes.delete(operationId)
    }
  }

  /**
   * Cancel all pending retries.
   * @private
   */
  private cancelAllRetries(): void {
    this.retryTimers.forEach((timer) => clearTimeout(timer))
    this.retryTimers.clear()
    this.retryTimes.clear()
  }

  /**
   * Get scheduled retry time for an operation.
   * @private
   */
  private getRetryTime(operationId: string): number | null {
    return this.retryTimes.get(operationId) || null
  }

  /**
   * Get retry attempt number for an operation.
   * @private
   */
  private getRetryAttempt(operationId: string): number {
    // Get from kernel
    if (this.kernel) {
      const op = this.kernel.getOperation(operationId)
      return op?.attempts || 0
    }
    return 0
  }
}

/**
 * Create retry engine plugin instance.
 */
export function retryEngine(options?: Partial<RetryOptions>): RetryEnginePlugin {
  return new RetryEnginePlugin(options)
}
