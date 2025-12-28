import { useContext } from 'react'
import type { Operation } from '../../types'
import { SyncKitContext } from './context'

/**
 * Hook to access the operation queue.
 *
 * @returns Array of operations
 * @throws Error if used outside SyncKitProvider
 *
 * @example
 * ```tsx
 * function QueueViewer() {
 *   const queue = useSyncQueue()
 *
 *   return (
 *     <ul>
 *       {queue.map((op) => (
 *         <li key={op.id}>
 *           {op.method} {op.resource} - {op.status}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useSyncQueue(): Operation[] {
  const context = useContext(SyncKitContext)

  if (!context) {
    throw new Error('useSyncQueue must be used within SyncKitProvider')
  }

  return context.queue
}
