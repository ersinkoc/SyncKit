import { createContext } from 'react'
import type { SyncKit, Operation, QueueStatus } from '../../types'

/**
 * SyncKit context value.
 */
export interface SyncKitContextValue {
  instance: SyncKit
  status: QueueStatus
  queue: Operation[]
  isOnline: boolean
}

/**
 * SyncKit React context.
 */
export const SyncKitContext = createContext<SyncKitContextValue | null>(null)
