import type {
  Plugin,
  SyncKit,
  Operation,
  ConflictStrategy,
  ConflictData,
  ConflictResolution,
  ConflictHandler,
} from '../../types'

/**
 * Conflict Resolver API exposed to users.
 */
export interface ConflictResolverAPI {
  detect(operation: Operation, serverResponse: unknown): boolean
  resolve(conflict: ConflictData): Promise<ConflictResolution>
  setStrategy(strategy: ConflictStrategy): void
  getStrategy(): ConflictStrategy
  resolveConflict(operationId: string, resolution: ConflictResolution): void
}

/**
 * Conflict Resolver options.
 */
export interface ConflictResolverOptions {
  strategy?: ConflictStrategy
  customResolver?: ConflictHandler<any, any>
  detectConflict?: (operation: Operation, response: unknown) => boolean
}

/**
 * Conflict Resolver Plugin - detects and resolves conflicts.
 * Core plugin (always loaded).
 */
export class ConflictResolverPlugin implements Plugin {
  name = 'conflict-resolver'
  version = '1.0.0'
  type = 'core' as const

  private kernel?: SyncKit
  private strategy: ConflictStrategy
  private customResolver?: ConflictHandler<any, any>
  private customDetector?: (operation: Operation, response: unknown) => boolean
  private pendingResolutions: Map<string, (resolution: ConflictResolution) => void> = new Map()
  api!: ConflictResolverAPI

  constructor(options: ConflictResolverOptions = {}) {
    this.strategy = options.strategy || 'last-write-wins'
    this.customResolver = options.customResolver
    this.customDetector = options.detectConflict
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Expose API
    this.api = {
      detect: this.detect.bind(this),
      resolve: this.resolve.bind(this),
      setStrategy: this.setStrategy.bind(this),
      getStrategy: () => this.strategy,
      resolveConflict: this.resolveConflict.bind(this),
    }
  }

  uninstall(): void {
    this.pendingResolutions.clear()
  }

  /**
   * Detect if response indicates a conflict.
   */
  private detect(operation: Operation, serverResponse: any): boolean {
    // Custom detector
    if (this.customDetector) {
      return this.customDetector(operation, serverResponse)
    }

    // Check HTTP 409 status
    if (serverResponse?.status === 409) {
      return true
    }

    // Check version mismatch
    if (serverResponse?.version && operation.metadata?.version) {
      if (serverResponse.version !== operation.metadata.version) {
        return true
      }
    }

    // Check ETag mismatch
    if (serverResponse?.etag && operation.metadata?.etag) {
      if (serverResponse.etag !== operation.metadata.etag) {
        return true
      }
    }

    return false
  }

  /**
   * Resolve a conflict using the configured strategy.
   */
  private async resolve(conflict: ConflictData): Promise<ConflictResolution> {
    switch (this.strategy) {
      case 'last-write-wins':
        return this.lastWriteWins(conflict)

      case 'server-wins':
        return 'server'

      case 'client-wins':
        return 'client'

      case 'manual':
        return this.waitForManualResolution(conflict)

      case 'custom':
        if (this.customResolver) {
          return await this.customResolver(conflict)
        }
        throw new Error('Custom resolver not provided')

      default:
        // Safe default
        return 'server'
    }
  }

  /**
   * Last-write-wins strategy - compare timestamps.
   * @private
   */
  private lastWriteWins(conflict: ConflictData): ConflictResolution {
    return conflict.localTimestamp > conflict.serverTimestamp ? 'client' : 'server'
  }

  /**
   * Wait for manual resolution from user.
   * @private
   */
  private async waitForManualResolution(conflict: ConflictData): Promise<ConflictResolution> {
    return new Promise((resolve) => {
      // Emit conflict event for UI to handle
      if (this.kernel) {
        this.kernel.emit({
          type: 'conflict',
          timestamp: Date.now(),
          operation: conflict.operation,
          serverData: conflict.serverData,
          localData: conflict.localData,
          resolution: null,
        })
      }

      // Store resolver for later
      this.pendingResolutions.set(conflict.operation.id, resolve)
    })
  }

  /**
   * Manually resolve a conflict (called by UI or user code).
   */
  private resolveConflict(operationId: string, resolution: ConflictResolution): void {
    const resolve = this.pendingResolutions.get(operationId)
    if (resolve) {
      resolve(resolution)
      this.pendingResolutions.delete(operationId)
    }
  }

  /**
   * Set conflict resolution strategy.
   * @private
   */
  private setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy
  }
}

/**
 * Create conflict resolver plugin instance.
 */
export function conflictResolver(
  options?: ConflictResolverOptions
): ConflictResolverPlugin {
  return new ConflictResolverPlugin(options)
}
