/**
 * Service Worker Event Handlers.
 * Provides utilities for handling sync events in service workers.
 */

/**
 * Message types for communication between main thread and service worker.
 */
export type SWMessage =
  | { type: 'SKIP_WAITING' }
  | { type: 'CLAIM_CLIENTS' }
  | { type: 'SYNC_NOW'; payload?: unknown }
  | { type: 'SYNC_COMPLETE'; success: boolean; result?: unknown }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'GET_QUEUE' }
  | { type: 'QUEUE_RESPONSE'; operations: unknown[] }

/**
 * Sync event handler function.
 */
export type SyncEventHandler = (event: SyncEvent) => Promise<void> | void

/**
 * Periodic sync event handler function.
 */
export type PeriodicSyncEventHandler = (event: PeriodicSyncEvent) => Promise<void> | void

/**
 * Message event handler function.
 */
export type MessageEventHandler = (event: ExtendableMessageEvent) => Promise<void> | void

/**
 * Sync event interface (for typing).
 */
export interface SyncEvent extends ExtendableEvent {
  tag: string
  lastChance: boolean
}

/**
 * Periodic sync event interface (for typing).
 */
export interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}

/**
 * Service worker handler options.
 */
export interface SWHandlerOptions {
  /**
   * Tag prefix for sync events.
   * @default 'synckit-sync'
   */
  tagPrefix?: string

  /**
   * Custom sync handler.
   * Called when a sync event is triggered.
   */
  onSync?: SyncEventHandler

  /**
   * Custom periodic sync handler.
   * Called when a periodic sync event is triggered.
   */
  onPeriodicSync?: PeriodicSyncEventHandler

  /**
   * Custom message handler.
   * Called when a message is received from the main thread.
   */
  onMessage?: MessageEventHandler

  /**
   * Enable logging.
   * @default false
   */
  enableLogging?: boolean
}

/**
 * Set up service worker event handlers.
 * Call this in your service worker file.
 */
export function setupSWHandlers(options: SWHandlerOptions = {}): void {
  const {
    tagPrefix = 'synckit-sync',
    onSync,
    onPeriodicSync,
    onMessage,
    enableLogging = false,
  } = options

  const log = (...args: unknown[]) => {
    if (enableLogging) {
      console.log('[SyncKit SW]', ...args)
    }
  }

  // Handle sync events
  self.addEventListener('sync', (event: Event) => {
    const syncEvent = event as SyncEvent
    log('Sync event triggered:', syncEvent.tag)

    // Only handle our sync events
    if (!syncEvent.tag.startsWith(tagPrefix)) {
      return
    }

    if (onSync) {
      syncEvent.waitUntil(
        Promise.resolve(onSync(syncEvent)).catch((error) => {
          console.error('[SyncKit SW] Sync handler error:', error)
        })
      )
    }
  })

  // Handle periodic sync events
  self.addEventListener('periodicsync', (event: Event) => {
    const periodicSyncEvent = event as PeriodicSyncEvent
    log('Periodic sync event triggered:', periodicSyncEvent.tag)

    // Only handle our sync events
    if (periodicSyncEvent.tag !== tagPrefix) {
      return
    }

    if (onPeriodicSync) {
      periodicSyncEvent.waitUntil(
        Promise.resolve(onPeriodicSync(periodicSyncEvent)).catch((error) => {
          console.error('[SyncKit SW] Periodic sync handler error:', error)
        })
      )
    }
  })

  // Handle messages from main thread
  self.addEventListener('message', (event: Event) => {
    const messageEvent = event as ExtendableMessageEvent
    const message = messageEvent.data as SWMessage
    log('Message received:', message.type)

    // Handle built-in messages
    if (message.type === 'SKIP_WAITING') {
      ;(self as unknown as ServiceWorkerGlobalScope).skipWaiting()
      return
    }

    if (message.type === 'CLAIM_CLIENTS') {
      messageEvent.waitUntil(
        (self as unknown as ServiceWorkerGlobalScope).clients.claim().catch((error) => {
          console.error('[SyncKit SW] Claim clients error:', error)
        })
      )
      return
    }

    // Handle custom messages
    if (onMessage) {
      messageEvent.waitUntil(
        Promise.resolve(onMessage(messageEvent)).catch((error) => {
          console.error('[SyncKit SW] Message handler error:', error)
        })
      )
    }
  })
}

/**
 * Send a message to all clients.
 */
export async function messageAllClients(message: SWMessage): Promise<void> {
  const clients = await (self as unknown as ServiceWorkerGlobalScope).clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  for (const client of clients) {
    client.postMessage(message)
  }
}

/**
 * Send a message to a specific client.
 */
export async function messageClient(clientId: string, message: SWMessage): Promise<void> {
  const client = await (self as unknown as ServiceWorkerGlobalScope).clients.get(clientId)

  if (client) {
    client.postMessage(message)
  }
}

/**
 * Create a default sync handler that fetches operations from IndexedDB and syncs them.
 * This is a helper for common use cases.
 */
export function createDefaultSyncHandler(
  executor: (operations: unknown[]) => Promise<unknown[]>
): SyncEventHandler {
  return async (event: SyncEvent) => {
    try {
      // Open IndexedDB
      const db = await openDatabase()
      const operations = await getOperationsFromDB(db)

      if (operations.length === 0) {
        await messageAllClients({
          type: 'SYNC_COMPLETE',
          success: true,
          result: [],
        })
        return
      }

      // Execute sync
      const results = await executor(operations)

      // Clean up synced operations
      await clearOperationsFromDB(db, operations)

      // Notify clients
      await messageAllClients({
        type: 'SYNC_COMPLETE',
        success: true,
        result: results,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[SyncKit SW] Sync failed:', errorMessage)

      await messageAllClients({
        type: 'SYNC_ERROR',
        error: errorMessage,
      })

      // Rethrow on last chance to prevent retry
      if (event.lastChance) {
        throw error
      }
    }
  }
}

/**
 * Helper: Open IndexedDB database.
 * @private
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('synckit', 1)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('operations')) {
        const store = db.createObjectStore('operations', { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('priority', 'priority', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('resource', 'resource', { unique: false })
      }
    }
  })
}

/**
 * Helper: Get pending operations from IndexedDB.
 * @private
 */
async function getOperationsFromDB(db: IDBDatabase): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('operations', 'readonly')
    const store = transaction.objectStore('operations')
    const index = store.index('status')
    const request = index.getAll('pending')

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result || [])
    }
  })
}

/**
 * Helper: Clear synced operations from IndexedDB.
 * @private
 */
async function clearOperationsFromDB(db: IDBDatabase, operations: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('operations', 'readwrite')
    const store = transaction.objectStore('operations')

    for (const operation of operations) {
      const op = operation as { id: string }
      store.delete(op.id)
    }

    transaction.onerror = () => {
      reject(transaction.error)
    }

    transaction.oncomplete = () => {
      resolve()
    }
  })
}
