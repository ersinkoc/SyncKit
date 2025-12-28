/**
 * Svelte adapter for SyncKit.
 * Provides Svelte stores for offline-first data synchronization.
 *
 * @module adapters/svelte
 */

import { writable, readable, type Readable } from 'svelte/store'
import {
  createSyncKit as createSyncKitCore,
  type SyncKit,
  type SyncKitConfig,
  type Operation,
  type OperationInput,
  type PushResult,
} from '../../index'

/**
 * Sync status interface.
 */
export interface SyncStatus {
  pending: number
  syncing: number
  failed: number
  total: number
  isIdle: boolean
  hasErrors: boolean
}

/**
 * Queue store interface.
 */
export interface QueueState {
  operations: Operation[]
  pending: Operation[]
  syncing: Operation[]
  failed: Operation[]
}

/**
 * Online status interface.
 */
export interface OnlineState {
  isOnline: boolean
  networkType: string | null
  effectiveType: string | null
}

/**
 * Sync store interface.
 */
export interface SyncStore {
  kernel: SyncKit
  push: (input: OperationInput) => PushResult
  remove: (operationId: string) => boolean
  clear: () => void
  retry: (operationId: string) => Promise<any>
  retryAll: () => Promise<any>
  pause: () => void
  resume: () => void
  isPaused: Readable<boolean>
}

/**
 * Create SyncKit Svelte stores.
 */
export function createSyncStore<TPayload = unknown, TResult = unknown>(
  config: SyncKitConfig<TPayload, TResult>
): SyncStore {
  // Create kernel
  const kernel = createSyncKitCore<TPayload, TResult>(config)

  // Initialize kernel
  kernel.init().catch((error) => {
    console.error('Failed to initialize SyncKit:', error)
  })

  // Paused state
  const isPaused = writable(false)

  // Push operation
  const push = (input: OperationInput<TPayload>): PushResult => {
    return kernel.push(input)
  }

  // Remove operation
  const remove = (operationId: string): boolean => {
    return kernel.remove(operationId)
  }

  // Clear all operations
  const clear = (): void => {
    kernel.clear()
  }

  // Retry operation
  const retry = async (operationId: string) => {
    return kernel.retry(operationId)
  }

  // Retry all operations
  const retryAll = async () => {
    return kernel.retryAll()
  }

  // Pause sync
  const pause = (): void => {
    kernel.pause()
    isPaused.set(true)
  }

  // Resume sync
  const resume = (): void => {
    kernel.resume()
    isPaused.set(false)
  }

  return {
    kernel: kernel as any,
    push: push as any,
    remove,
    clear,
    retry,
    retryAll,
    pause,
    resume,
    isPaused: { subscribe: isPaused.subscribe },
  }
}

/**
 * Create status store from SyncKit kernel.
 */
export function createStatusStore(kernel: SyncKit): Readable<SyncStatus> {
  return readable<SyncStatus>(
    {
      pending: 0,
      syncing: 0,
      failed: 0,
      total: 0,
      isIdle: true,
      hasErrors: false,
    },
    (set) => {
      const updateStatus = () => {
        const queueManager = kernel.getPlugin('queue-manager')

        if (queueManager) {
          const api = queueManager.api as any
          if (api) {
            const pending = api.getByStatus('pending').length
            const syncing = api.getByStatus('syncing').length
            const failed = api.getByStatus('failed').length
            const total = api.count()

            set({
              pending,
              syncing,
              failed,
              total,
              isIdle: pending === 0 && syncing === 0,
              hasErrors: failed > 0,
            })
          }
        }
      }

      // Initial update
      updateStatus()

      // Subscribe to events
      const unsubscribers = [
        kernel.on('push', updateStatus),
        kernel.on('sync-start', updateStatus),
        kernel.on('sync-success', updateStatus),
        kernel.on('sync-error', updateStatus),
        kernel.on('remove', updateStatus),
        kernel.on('clear', updateStatus),
      ]

      // Cleanup
      return () => {
        unsubscribers.forEach((unsub) => unsub())
      }
    }
  )
}

/**
 * Create queue store from SyncKit kernel.
 */
export function createQueueStore(kernel: SyncKit): Readable<QueueState> {
  return readable<QueueState>(
    {
      operations: [],
      pending: [],
      syncing: [],
      failed: [],
    },
    (set) => {
      const updateQueue = () => {
        const queueManager = kernel.getPlugin('queue-manager')

        if (queueManager) {
          const api = queueManager.api as any
          if (api) {
            const operations = api.getAll()

            set({
              operations,
              pending: operations.filter((op: Operation) => op.status === 'pending'),
              syncing: operations.filter((op: Operation) => op.status === 'syncing'),
              failed: operations.filter((op: Operation) => op.status === 'failed'),
            })
          }
        }
      }

      // Initial update
      updateQueue()

      // Subscribe to events
      const unsubscribers = [
        kernel.on('push', updateQueue),
        kernel.on('sync-start', updateQueue),
        kernel.on('sync-success', updateQueue),
        kernel.on('sync-error', updateQueue),
        kernel.on('remove', updateQueue),
        kernel.on('clear', updateQueue),
      ]

      // Cleanup
      return () => {
        unsubscribers.forEach((unsub) => unsub())
      }
    }
  )
}

/**
 * Create online status store from SyncKit kernel.
 */
export function createOnlineStore(kernel: SyncKit): Readable<OnlineState> {
  return readable<OnlineState>(
    {
      isOnline: navigator.onLine,
      networkType: null,
      effectiveType: null,
    },
    (set) => {
      const updateOnlineStatus = () => {
        const networkMonitor = kernel.getPlugin('network-monitor')

        if (networkMonitor) {
          const api = networkMonitor.api as any
          if (api) {
            set({
              isOnline: api.isOnline(),
              networkType: api.getConnectionType(),
              effectiveType: api.getEffectiveType(),
            })
          }
        } else {
          set({
            isOnline: navigator.onLine,
            networkType: null,
            effectiveType: null,
          })
        }
      }

      // Initial update
      updateOnlineStatus()

      // Subscribe to events
      const unsubscribers = [
        kernel.on('online', updateOnlineStatus),
        kernel.on('offline', updateOnlineStatus),
      ]

      // Cleanup
      return () => {
        unsubscribers.forEach((unsub) => unsub())
      }
    }
  )
}

/**
 * Create a store for a single operation.
 */
export function createOperationStore(
  kernel: SyncKit,
  operationId: string
): Readable<Operation | null> {
  return readable<Operation | null>(null, (set) => {
    const updateOperation = () => {
      const queueManager = kernel.getPlugin('queue-manager')

      if (queueManager) {
        const api = queueManager.api as any
        if (api) {
          const operation = api.find((op: Operation) => op.id === operationId)
          set(operation || null)
        }
      }
    }

    // Initial update
    updateOperation()

    // Subscribe to events
    const unsubscribers = [
      kernel.on('push', updateOperation),
      kernel.on('sync-start', updateOperation),
      kernel.on('sync-success', updateOperation),
      kernel.on('sync-error', updateOperation),
      kernel.on('remove', updateOperation),
    ]

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  })
}

// Re-export types
export type { SyncKit, SyncKitConfig, Operation, OperationInput, PushResult }
