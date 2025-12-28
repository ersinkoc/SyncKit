import { useContext } from 'react'
import type { Operation } from '../../types'
import { SyncKitContext } from './context'

/**
 * Hook to access a specific operation by ID.
 *
 * @param operationId - Operation ID
 * @returns Operation or undefined if not found
 * @throws Error if used outside SyncKitProvider
 *
 * @example
 * ```tsx
 * function OperationStatus({ operationId }: { operationId: string }) {
 *   const operation = useSyncOperation(operationId)
 *
 *   if (!operation) return null
 *
 *   return (
 *     <div>
 *       Status: {operation.status}
 *       {operation.status === 'failed' && (
 *         <span>Attempts: {operation.attempts}</span>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSyncOperation(operationId: string): Operation | undefined {
  const context = useContext(SyncKitContext)

  if (!context) {
    throw new Error('useSyncOperation must be used within SyncKitProvider')
  }

  return context.queue.find((op) => op.id === operationId)
}
