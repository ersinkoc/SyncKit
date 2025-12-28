import { useContext } from 'react'
import type { OperationInput, PushResult, SyncResult } from '../../types'
import { SyncKitContext } from './context'

/**
 * useSync hook return type.
 */
export interface UseSyncReturn {
  push: (operation: OperationInput) => PushResult
  remove: (operationId: string) => boolean
  retry: (operationId: string) => Promise<SyncResult>
  retryAll: () => Promise<SyncResult[]>
  pause: () => void
  resume: () => void
  clear: () => void
  sync: () => Promise<SyncResult[]>
  batch: (batchId: string, operations: OperationInput[]) => string
  isOnline: boolean
  isPaused: boolean
}

/**
 * Main SyncKit hook - provides access to all sync operations.
 *
 * @returns Sync operations and state
 * @throws Error if used outside SyncKitProvider
 *
 * @example
 * ```tsx
 * function CreatePost() {
 *   const { push, isOnline, isPaused } = useSync()
 *
 *   const handleSubmit = (data) => {
 *     const { operationId, rollback } = push({
 *       resource: 'posts',
 *       method: 'POST',
 *       payload: data,
 *       optimistic: true,
 *       onError: () => rollback()
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {!isOnline && <Badge>Offline</Badge>}
 *       <form onSubmit={handleSubmit}>...</form>
 *     </div>
 *   )
 * }
 * ```
 */
export function useSync(): UseSyncReturn {
  const context = useContext(SyncKitContext)

  if (!context) {
    throw new Error('useSync must be used within SyncKitProvider')
  }

  const { instance, isOnline } = context

  return {
    push: instance.push.bind(instance),
    remove: instance.remove.bind(instance),
    retry: instance.retry.bind(instance),
    retryAll: instance.retryAll.bind(instance),
    pause: instance.pause.bind(instance),
    resume: instance.resume.bind(instance),
    clear: instance.clear.bind(instance),
    sync: instance.sync.bind(instance),
    batch: instance.batch.bind(instance),
    isOnline,
    isPaused: instance.isPaused(),
  }
}
