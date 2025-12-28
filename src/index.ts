import type { SyncKit, SyncKitConfig } from './types'
import { SyncKitKernel } from './kernel/kernel'
import {
  queueManager,
  networkMonitor,
  indexedDBStorage,
  retryEngine,
  conflictResolver,
} from './plugins/core'

/**
 * Create a SyncKit instance with automatic core plugin registration.
 *
 * @param config - Configuration options
 * @returns SyncKit instance
 *
 * @example
 * ```ts
 * const sync = createSyncKit({
 *   name: 'my-app',
 *   storage: 'indexeddb',
 *   executor: async (op) => {
 *     const res = await fetch(`/api/${op.resource}`, {
 *       method: op.method,
 *       body: JSON.stringify(op.payload)
 *     })
 *     return res.json()
 *   },
 *   conflictStrategy: 'last-write-wins',
 *   retry: {
 *     maxAttempts: 5,
 *     backoff: 'exponential'
 *   }
 * })
 *
 * await sync.init()
 * ```
 */
export function createSyncKit<TPayload = unknown, TResult = unknown>(
  config: SyncKitConfig<TPayload, TResult>
): SyncKit<TPayload, TResult> {
  // Create kernel
  const kernel = new SyncKitKernel<TPayload, TResult>(config)

  // Register core plugins synchronously (before init)
  // These are required for the kernel to function

  // 1. Queue Manager - manages the operation queue
  kernel.register(queueManager())

  // 2. Network Monitor - detects online/offline status
  kernel.register(networkMonitor())

  // 3. Storage - IndexedDB by default
  if (config.storage === 'indexeddb' || !config.storage) {
    kernel.register(indexedDBStorage({ dbName: `synckit-${config.name}` }))
  }
  // Note: localStorage and custom adapters are handled by the kernel

  // 4. Retry Engine - automatic retry with backoff
  kernel.register(retryEngine(config.retry))

  // 5. Conflict Resolver - conflict detection and resolution
  kernel.register(
    conflictResolver({
      strategy: config.conflictStrategy,
      customResolver: config.onConflict,
    })
  )

  return kernel
}

// Re-export types
export * from './types'

// Re-export core plugins (for advanced users who want to customize)
export {
  queueManager,
  networkMonitor,
  indexedDBStorage,
  retryEngine,
  conflictResolver,
} from './plugins/core'
