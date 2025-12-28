import { useContext } from 'react'
import type { QueueStatus } from '../../types'
import { SyncKitContext } from './context'

/**
 * Hook to access queue status.
 *
 * @returns Queue status
 * @throws Error if used outside SyncKitProvider
 *
 * @example
 * ```tsx
 * function StatusBar() {
 *   const { pending, syncing, failed } = useSyncStatus()
 *
 *   return (
 *     <div>
 *       {pending > 0 && <span>{pending} pending</span>}
 *       {syncing > 0 && <span>{syncing} syncing</span>}
 *       {failed > 0 && <span className="error">{failed} failed</span>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSyncStatus(): QueueStatus {
  const context = useContext(SyncKitContext)

  if (!context) {
    throw new Error('useSyncStatus must be used within SyncKitProvider')
  }

  return context.status
}
