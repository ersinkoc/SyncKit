import { useContext } from 'react'
import { SyncKitContext } from './context'

/**
 * Hook to access online status.
 *
 * @returns true if online, false if offline
 * @throws Error if used outside SyncKitProvider
 *
 * @example
 * ```tsx
 * function OnlineIndicator() {
 *   const isOnline = useOnline()
 *
 *   return (
 *     <span className={isOnline ? 'online' : 'offline'}>
 *       {isOnline ? '🟢 Online' : '🔴 Offline'}
 *     </span>
 *   )
 * }
 * ```
 */
export function useOnline(): boolean {
  const context = useContext(SyncKitContext)

  if (!context) {
    throw new Error('useOnline must be used within SyncKitProvider')
  }

  return context.isOnline
}
