import type { Plugin, SyncKit, StorageAdapter, Operation } from '../../types'

/**
 * LocalStorage storage options.
 */
export interface LocalStorageOptions {
  storageKey?: string
}

/**
 * LocalStorage Storage Plugin - persists queue to localStorage.
 * Optional plugin (user must register manually).
 */
export class LocalStoragePlugin implements Plugin, StorageAdapter {
  name = 'storage-localstorage'
  version = '1.0.0'
  type = 'optional' as const

  private storageKey: string
  api!: StorageAdapter

  constructor(options: LocalStorageOptions = {}) {
    this.storageKey = options.storageKey || 'synckit:operations'
  }

  install(_kernel: SyncKit): void {
    // Expose self as API (implements StorageAdapter)
    this.api = this
  }

  async uninstall(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Initialize localStorage (no-op, always ready).
   */
  async init(): Promise<void> {
    // localStorage is synchronous and always ready
  }

  /**
   * Get operation by ID.
   */
  async get(key: string): Promise<Operation | undefined> {
    const operations = await this.getAll()
    return operations.find((op) => op.id === key)
  }

  /**
   * Get all operations.
   */
  async getAll(): Promise<Operation[]> {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) {
        return []
      }
      return JSON.parse(data) as Operation[]
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  }

  /**
   * Save single operation.
   */
  async set(_key: string, value: Operation): Promise<void> {
    const operations = await this.getAll()
    const index = operations.findIndex((op) => op.id === value.id)

    if (index >= 0) {
      operations[index] = value
    } else {
      operations.push(value)
    }

    await this.setAll(operations)
  }

  /**
   * Save all operations (replace entire queue).
   */
  async setAll(operations: Operation[]): Promise<void> {
    try {
      const data = JSON.stringify(operations)
      localStorage.setItem(this.storageKey, data)
    } catch (error) {
      // Handle quota exceeded error
      if ((error as Error).name === 'QuotaExceededError') {
        throw new Error(
          'localStorage quota exceeded. Consider using IndexedDB or clearing old operations.'
        )
      }
      throw error
    }
  }

  /**
   * Remove operation by ID.
   */
  async remove(key: string): Promise<void> {
    const operations = await this.getAll()
    const filtered = operations.filter((op) => op.id !== key)
    await this.setAll(filtered)
  }

  /**
   * Clear all operations.
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  /**
   * Get count of operations.
   */
  async count(): Promise<number> {
    const operations = await this.getAll()
    return operations.length
  }

  /**
   * Close (no-op for localStorage).
   */
  async close(): Promise<void> {
    // No cleanup needed for localStorage
  }
}

/**
 * Create localStorage storage plugin instance.
 */
export function localStoragePlugin(options?: LocalStorageOptions): LocalStoragePlugin {
  return new LocalStoragePlugin(options)
}
