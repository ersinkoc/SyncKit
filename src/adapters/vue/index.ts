/**
 * Vue adapter for SyncKit.
 * Provides Vue 3 composables and plugin for offline-first data synchronization.
 *
 * @module adapters/vue
 */

import { ref, computed, onMounted, onUnmounted, inject, type App, type InjectionKey, type Ref, type ComputedRef } from 'vue'
import { createSyncKit as createSyncKitCore, type SyncKit, type SyncKitConfig, type Operation, type OperationInput, type Unsubscribe, type PushResult } from '../../index'

/**
 * Injection key for SyncKit instance.
 */
export const SyncKitKey: InjectionKey<SyncKit<any, any>> = Symbol('SyncKit')

/**
 * Vue plugin options.
 */
export interface SyncKitPluginOptions<TPayload = unknown, TResult = unknown> extends SyncKitConfig<TPayload, TResult> {
  /**
   * Auto-initialize the kernel.
   * @default true
   */
  autoInit?: boolean
}

/**
 * Create and install SyncKit Vue plugin.
 */
export function createSyncKit<TPayload = unknown, TResult = unknown>(options: SyncKitPluginOptions<TPayload, TResult>) {
  const { autoInit = true, ...syncKitOptions } = options
  const kernel = createSyncKitCore<TPayload, TResult>(syncKitOptions)

  return {
    install(app: App) {
      // Initialize kernel if auto-init is enabled
      if (autoInit) {
        kernel.init().catch((error) => {
          console.error('Failed to initialize SyncKit:', error)
        })
      }

      // Provide kernel to all components
      app.provide(SyncKitKey, kernel as SyncKit<any, any>)

      // Clean up on unmount
      app.config.globalProperties.$synckit = kernel

      // Handle app unmount
      const originalUnmount = app.unmount
      app.unmount = function () {
        kernel.destroy().catch((error) => {
          console.error('Failed to destroy SyncKit:', error)
        })
        originalUnmount.call(this)
      }
    },
    kernel,
  }
}

/**
 * Main composable for sync operations.
 */
export function useSync<TPayload = unknown, TResult = unknown>() {
  const kernel = inject(SyncKitKey)

  if (!kernel) {
    throw new Error('SyncKit not provided. Did you install the plugin?')
  }

  const isPaused = ref(false)

  /**
   * Push an operation to the sync queue.
   */
  const push = (input: OperationInput<TPayload>): PushResult => {
    return (kernel as SyncKit<TPayload, TResult>).push(input)
  }

  /**
   * Remove an operation from the queue.
   */
  const remove = (operationId: string): boolean => {
    return kernel.remove(operationId)
  }

  /**
   * Clear all operations.
   */
  const clear = (): void => {
    return kernel.clear()
  }

  /**
   * Retry a failed operation.
   */
  const retry = async (operationId: string) => {
    return (kernel as SyncKit<TPayload, TResult>).retry(operationId)
  }

  /**
   * Retry all failed operations.
   */
  const retryAll = async () => {
    return (kernel as SyncKit<TPayload, TResult>).retryAll()
  }

  /**
   * Pause sync operations.
   */
  const pause = (): void => {
    kernel.pause()
    isPaused.value = true
  }

  /**
   * Resume sync operations.
   */
  const resume = (): void => {
    kernel.resume()
    isPaused.value = false
  }

  return {
    kernel,
    push,
    remove,
    clear,
    retry,
    retryAll,
    pause,
    resume,
    isPaused,
  }
}

/**
 * Queue status composable.
 */
export function useSyncStatus() {
  const kernel = inject(SyncKitKey)

  if (!kernel) {
    throw new Error('SyncKit not provided. Did you install the plugin?')
  }

  const pending = ref(0)
  const syncing = ref(0)
  const failed = ref(0)
  const total = ref(0)

  const updateStatus = () => {
    const queueManager = kernel.getPlugin('queue-manager')

    if (queueManager) {
      const api = queueManager.api as any
      if (api) {
        pending.value = api.getByStatus('pending').length
        syncing.value = api.getByStatus('syncing').length
        failed.value = api.getByStatus('failed').length
        total.value = api.count()
      }
    }
  }

  const isIdle = computed(() => pending.value === 0 && syncing.value === 0)
  const hasErrors = computed(() => failed.value > 0)

  let unsubscribers: Unsubscribe[] = []

  onMounted(() => {
    updateStatus()

    // Subscribe to events
    unsubscribers = [
      kernel.on('push', updateStatus),
      kernel.on('sync-start', updateStatus),
      kernel.on('sync-success', updateStatus),
      kernel.on('sync-error', updateStatus),
      kernel.on('remove', updateStatus),
      kernel.on('clear', updateStatus),
    ]
  })

  onUnmounted(() => {
    unsubscribers.forEach((unsub) => unsub())
  })

  return {
    pending,
    syncing,
    failed,
    total,
    isIdle,
    hasErrors,
  }
}

/**
 * Queue operations composable.
 */
export function useSyncQueue(): {
  operations: Ref<Operation[]>
  pendingOperations: ComputedRef<Operation[]>
  syncingOperations: ComputedRef<Operation[]>
  failedOperations: ComputedRef<Operation[]>
} {
  const kernel = inject(SyncKitKey)

  if (!kernel) {
    throw new Error('SyncKit not provided. Did you install the plugin?')
  }

  const operations = ref<Operation[]>([])

  const updateOperations = () => {
    const queueManager = kernel.getPlugin('queue-manager')

    if (queueManager) {
      const api = queueManager.api as any
      if (api) {
        operations.value = api.getAll()
      }
    }
  }

  const pendingOperations = computed(() =>
    operations.value.filter((op) => op.status === 'pending')
  )
  const syncingOperations = computed(() =>
    operations.value.filter((op) => op.status === 'syncing')
  )
  const failedOperations = computed(() =>
    operations.value.filter((op) => op.status === 'failed')
  )

  let unsubscribers: Unsubscribe[] = []

  onMounted(() => {
    updateOperations()

    // Subscribe to events
    unsubscribers = [
      kernel.on('push', updateOperations),
      kernel.on('sync-start', updateOperations),
      kernel.on('sync-success', updateOperations),
      kernel.on('sync-error', updateOperations),
      kernel.on('remove', updateOperations),
      kernel.on('clear', updateOperations),
    ]
  })

  onUnmounted(() => {
    unsubscribers.forEach((unsub) => unsub())
  })

  return {
    operations,
    pendingOperations,
    syncingOperations,
    failedOperations,
  }
}

/**
 * Online status composable.
 */
export function useOnline() {
  const kernel = inject(SyncKitKey)

  if (!kernel) {
    throw new Error('SyncKit not provided. Did you install the plugin?')
  }

  const isOnline = ref(navigator.onLine)
  const networkType = ref<string | null>(null)
  const effectiveType = ref<string | null>(null)

  const updateNetworkInfo = () => {
    const networkMonitor = kernel.getPlugin('network-monitor')

    if (networkMonitor) {
      const api = networkMonitor.api as any
      if (api) {
        isOnline.value = api.isOnline()
        networkType.value = api.getConnectionType()
        effectiveType.value = api.getEffectiveType()
      }
    } else {
      isOnline.value = navigator.onLine
    }
  }

  let unsubscribers: Unsubscribe[] = []

  onMounted(() => {
    updateNetworkInfo()

    // Subscribe to events
    unsubscribers = [
      kernel.on('online', () => {
        isOnline.value = true
        updateNetworkInfo()
      }),
      kernel.on('offline', () => {
        isOnline.value = false
        updateNetworkInfo()
      }),
    ]
  })

  onUnmounted(() => {
    unsubscribers.forEach((unsub) => unsub())
  })

  return {
    isOnline,
    networkType,
    effectiveType,
  }
}

/**
 * Single operation composable.
 */
export function useSyncOperation(operationId: Ref<string | null> | string) {
  const kernel = inject(SyncKitKey)

  if (!kernel) {
    throw new Error('SyncKit not provided. Did you install the plugin?')
  }

  const operation = ref<Operation | null>(null)
  const isLoading = computed(() => operation.value?.status === 'syncing')
  const hasError = computed(() => operation.value?.status === 'failed')
  const isSuccess = computed(() => operation.value?.status === 'success')

  const updateOperation = () => {
    const id = typeof operationId === 'string' ? operationId : operationId.value

    if (!id) {
      operation.value = null
      return
    }

    const queueManager = kernel.getPlugin('queue-manager')

    if (queueManager) {
      const api = queueManager.api as any
      if (api) {
        operation.value = api.find((op: Operation) => op.id === id) || null
      }
    }
  }

  let unsubscribers: Unsubscribe[] = []

  onMounted(() => {
    updateOperation()

    // Subscribe to events
    unsubscribers = [
      kernel.on('push', updateOperation),
      kernel.on('sync-start', updateOperation),
      kernel.on('sync-success', updateOperation),
      kernel.on('sync-error', updateOperation),
      kernel.on('remove', updateOperation),
    ]
  })

  onUnmounted(() => {
    unsubscribers.forEach((unsub) => unsub())
  })

  return {
    operation,
    isLoading,
    hasError,
    isSuccess,
  }
}

// Re-export types
export type { SyncKit, SyncKitConfig, Operation, OperationInput, PushResult }
