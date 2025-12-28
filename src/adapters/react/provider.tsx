import React, { useRef, useState, useEffect, type ReactNode } from 'react'
import { createSyncKit } from '../../index'
import type { SyncKitConfig, Plugin, QueueStatus, Operation } from '../../types'
import { SyncKitContext } from './context'

/**
 * SyncKit Provider props.
 */
export interface SyncKitProviderProps {
  children: ReactNode
  config: SyncKitConfig
  plugins?: Plugin[]
}

/**
 * SyncKit Provider - creates and manages SyncKit instance for React.
 *
 * @example
 * ```tsx
 * <SyncKitProvider
 *   config={{
 *     name: 'my-app',
 *     storage: 'indexeddb',
 *     executor: async (op) => { ... }
 *   }}
 *   plugins={[compression(), analytics()]}
 * >
 *   <App />
 * </SyncKitProvider>
 * ```
 */
export function SyncKitProvider({ children, config, plugins }: SyncKitProviderProps) {
  const instanceRef = useRef(createSyncKit(config))
  const [initialized, setInitialized] = useState(false)
  const [status, setStatus] = useState<QueueStatus>({
    pending: 0,
    syncing: 0,
    failed: 0,
    total: 0,
    isProcessing: false,
    isPaused: false,
    isOnline: true,
  })
  const [queue, setQueue] = useState<Operation[]>([])
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const instance = instanceRef.current

    // Register plugins
    if (plugins) {
      plugins.forEach((plugin) => {
        instance.register(plugin)
      })
    }

    // Subscribe to events
    const unsubscribes = [
      instance.on('status-change', (event) => {
        setStatus(event.status)
      }),

      instance.on('queue-change', (event) => {
        setQueue([...event.queue])
        setStatus(instance.getStatus())
      }),

      instance.on('online', () => {
        setIsOnline(true)
      }),

      instance.on('offline', () => {
        setIsOnline(false)
      }),
    ]

    // Initialize
    instance
      .init()
      .then(() => {
        setInitialized(true)
        setStatus(instance.getStatus())
        setQueue(instance.getQueue())
        setIsOnline(instance.isOnline())
      })
      .catch((error) => {
        console.error('Failed to initialize SyncKit:', error)
      })

    // Cleanup
    return () => {
      unsubscribes.forEach((unsub) => unsub())
      instance.destroy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render children until initialized
  if (!initialized) {
    return null
  }

  const value = {
    instance: instanceRef.current,
    status,
    queue,
    isOnline,
  }

  return <SyncKitContext.Provider value={value}>{children}</SyncKitContext.Provider>
}
