import type { Plugin, SyncKit, StorageAdapter, Operation } from '../../types'

/**
 * IndexedDB storage options.
 */
export interface IndexedDBStorageOptions {
  dbName?: string
  storeName?: string
  version?: number
}

/**
 * IndexedDB Storage Plugin - persists queue to IndexedDB.
 * Core plugin (always loaded when using 'indexeddb' storage).
 */
export class IndexedDBStoragePlugin implements Plugin, StorageAdapter {
  name = 'storage-indexeddb'
  version = '1.0.0'
  type = 'core' as const

  private db: IDBDatabase | null = null
  private dbName: string
  private storeName: string
  private dbVersion: number
  api!: StorageAdapter

  constructor(options: IndexedDBStorageOptions = {}) {
    this.dbName = options.dbName || 'synckit'
    this.storeName = options.storeName || 'operations'
    this.dbVersion = options.version || 1
  }

  install(_kernel: SyncKit): void {
    // Expose self as API (implements StorageAdapter)
    this.api = this
  }

  async uninstall(): Promise<void> {
    await this.close()
  }

  /**
   * Initialize IndexedDB.
   */
  async init(): Promise<void> {
    if (this.db) {
      return // Already initialized
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion)

        request.onerror = () => {
          reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
        }

        request.onsuccess = () => {
          this.db = request.result
          resolve()
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result

          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, {
              keyPath: 'id',
            })

            // Create indexes for efficient queries
            store.createIndex('status', 'status', { unique: false })
            store.createIndex('priority', 'priority', { unique: false })
            store.createIndex('createdAt', 'createdAt', { unique: false })
            store.createIndex('resource', 'resource', { unique: false })
            store.createIndex('batchId', 'batchId', { unique: false })
          }
        }
      } catch (error) {
        // Safari private mode throws SecurityError
        if ((error as Error).name === 'SecurityError') {
          reject(
            new Error(
              'IndexedDB not available (private browsing mode?). Use localStorage fallback.'
            )
          )
        } else {
          reject(error)
        }
      }
    })
  }

  /**
   * Get operation by ID.
   */
  async get(key: string): Promise<Operation | undefined> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Get all operations.
   */
  async getAll(): Promise<Operation[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  /**
   * Save single operation.
   */
  async set(_key: string, value: Operation): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Save all operations (replace entire queue).
   */
  async setAll(operations: Operation[]): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)

      // Clear existing
      const clearRequest = store.clear()

      clearRequest.onsuccess = () => {
        // Add all operations
        let pending = operations.length
        if (pending === 0) {
          resolve()
          return
        }

        let hasError = false

        operations.forEach((op) => {
          const putRequest = store.put(op)

          putRequest.onerror = () => {
            if (!hasError) {
              hasError = true
              reject(putRequest.error)
            }
          }

          putRequest.onsuccess = () => {
            pending--
            if (pending === 0 && !hasError) {
              resolve()
            }
          }
        })
      }

      clearRequest.onerror = () => reject(clearRequest.error)

      transaction.onerror = () => {
        if (!transaction.error) return
        reject(transaction.error)
      }
    })
  }

  /**
   * Remove operation by ID.
   */
  async remove(key: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Clear all operations.
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get count of operations.
   */
  async count(): Promise<number> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Close database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

/**
 * Create IndexedDB storage plugin instance.
 */
export function indexedDBStorage(
  options?: IndexedDBStorageOptions
): IndexedDBStoragePlugin {
  return new IndexedDBStoragePlugin(options)
}
