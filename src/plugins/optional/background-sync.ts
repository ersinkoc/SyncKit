import type { Plugin, SyncKit } from '../../types'

/**
 * Background Sync options.
 */
export interface BackgroundSyncOptions {
  /**
   * Service worker registration.
   * Required for background sync to work.
   */
  swRegistration?: ServiceWorkerRegistration

  /**
   * Tag prefix for background sync events.
   * @default 'synckit-sync'
   */
  tagPrefix?: string

  /**
   * Enable periodic background sync.
   * Requires Periodic Background Sync API support.
   * @default false
   */
  periodicSync?: boolean

  /**
   * Interval for periodic sync (ms).
   * @default 3600000 (1 hour)
   */
  periodicInterval?: number
}

/**
 * Background Sync API exposed to users.
 */
export interface BackgroundSyncAPI {
  /**
   * Register a background sync event.
   */
  register(tag?: string): Promise<void>

  /**
   * Get all registered background sync tags.
   */
  getTags(): Promise<string[]>

  /**
   * Check if Background Sync API is supported.
   */
  isSupported(): boolean

  /**
   * Check if Periodic Background Sync API is supported.
   */
  isPeriodicSyncSupported(): boolean
}

/**
 * Background Sync Plugin - uses Background Sync API for offline sync.
 * Optional plugin (user must register manually).
 * Requires service worker registration.
 */
export class BackgroundSyncPlugin implements Plugin {
  name = 'background-sync'
  version = '1.0.0'
  type = 'optional' as const

  private options: Required<Omit<BackgroundSyncOptions, 'swRegistration'>> &
    Pick<BackgroundSyncOptions, 'swRegistration'>
  api!: BackgroundSyncAPI

  constructor(options: BackgroundSyncOptions = {}) {
    this.options = {
      swRegistration: options.swRegistration,
      tagPrefix: options.tagPrefix || 'synckit-sync',
      periodicSync: options.periodicSync ?? false,
      periodicInterval: options.periodicInterval || 3600000,
    }
  }

  async install(_kernel: SyncKit): Promise<void> {
    // Check if Background Sync is supported
    if (!this.isSupported()) {
      console.warn('Background Sync API not supported. Plugin will be inactive.')
    }

    // Register periodic sync if enabled
    if (this.options.periodicSync && this.isPeriodicSyncSupported()) {
      await this.registerPeriodicSync()
    }

    // Expose API
    this.api = {
      register: this.register.bind(this),
      getTags: this.getTags.bind(this),
      isSupported: this.isSupported.bind(this),
      isPeriodicSyncSupported: this.isPeriodicSyncSupported.bind(this),
    }
  }

  async uninstall(): Promise<void> {
    // Unregister periodic sync if enabled
    if (this.options.periodicSync && this.isPeriodicSyncSupported()) {
      await this.unregisterPeriodicSync()
    }
  }

  /**
   * Plugin hooks.
   */
  hooks = {}

  /**
   * Register a background sync event.
   * @private
   */
  private async register(tag?: string): Promise<void> {
    if (!this.isSupported()) {
      return
    }

    const swRegistration = this.options.swRegistration
    if (!swRegistration) {
      console.warn('Service worker registration not provided. Cannot register background sync.')
      return
    }

    try {
      const syncTag = tag || `${this.options.tagPrefix}-${Date.now()}`
      await (swRegistration as any).sync.register(syncTag)
    } catch (error) {
      console.error('Failed to register background sync:', error)
    }
  }

  /**
   * Get all registered background sync tags.
   * @private
   */
  private async getTags(): Promise<string[]> {
    if (!this.isSupported()) {
      return []
    }

    const swRegistration = this.options.swRegistration
    if (!swRegistration) {
      return []
    }

    try {
      return await (swRegistration as any).sync.getTags()
    } catch (error) {
      console.error('Failed to get background sync tags:', error)
      return []
    }
  }

  /**
   * Check if Background Sync API is supported.
   * @private
   */
  private isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'SyncManager' in window &&
      this.options.swRegistration !== undefined
    )
  }

  /**
   * Check if Periodic Background Sync API is supported.
   * @private
   */
  private isPeriodicSyncSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PeriodicSyncManager' in window &&
      this.options.swRegistration !== undefined
    )
  }

  /**
   * Register periodic background sync.
   * @private
   */
  private async registerPeriodicSync(): Promise<void> {
    if (!this.isPeriodicSyncSupported()) {
      return
    }

    const swRegistration = this.options.swRegistration
    if (!swRegistration || !(swRegistration as any).periodicSync) {
      return
    }

    try {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      })

      if (status.state === 'granted') {
        await (swRegistration as any).periodicSync.register(this.options.tagPrefix, {
          minInterval: this.options.periodicInterval,
        })
      } else {
        console.warn('Periodic background sync permission not granted')
      }
    } catch (error) {
      console.error('Failed to register periodic background sync:', error)
    }
  }

  /**
   * Unregister periodic background sync.
   * @private
   */
  private async unregisterPeriodicSync(): Promise<void> {
    if (!this.isPeriodicSyncSupported()) {
      return
    }

    const swRegistration = this.options.swRegistration
    if (!swRegistration || !(swRegistration as any).periodicSync) {
      return
    }

    try {
      await (swRegistration as any).periodicSync.unregister(this.options.tagPrefix)
    } catch (error) {
      console.error('Failed to unregister periodic background sync:', error)
    }
  }
}

/**
 * Create background sync plugin instance.
 */
export function backgroundSyncPlugin(options?: BackgroundSyncOptions): BackgroundSyncPlugin {
  return new BackgroundSyncPlugin(options)
}
