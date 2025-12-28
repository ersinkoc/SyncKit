import type { Plugin, SyncKit, Unsubscribe } from '../../types'

/**
 * Connection type from Network Information API.
 */
export type ConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'wifi'
  | 'wimax'
  | 'other'
  | 'none'
  | 'unknown'

/**
 * Effective connection type from Network Information API.
 */
export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g'

/**
 * Network Monitor API exposed to users.
 */
export interface NetworkMonitorAPI {
  isOnline(): boolean
  getConnectionType(): ConnectionType | null
  getEffectiveType(): EffectiveConnectionType | null
  onStatusChange(handler: (online: boolean) => void): Unsubscribe
}

/**
 * Network Monitor options.
 */
export interface NetworkMonitorOptions {
  pingUrl?: string
  pingInterval?: number
  pingTimeout?: number
}

/**
 * Network Monitor Plugin - detects online/offline status.
 * Core plugin (always loaded).
 */
export class NetworkMonitorPlugin implements Plugin {
  name = 'network-monitor'
  version = '1.0.0'
  type = 'core' as const

  private kernel?: SyncKit
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private pingTimer: number | null = null
  private debounceTimer: number | null = null
  private statusHandlers: Set<(online: boolean) => void> = new Set()
  private options: NetworkMonitorOptions

  api!: NetworkMonitorAPI

  constructor(options: NetworkMonitorOptions = {}) {
    this.options = {
      pingInterval: 30000,
      pingTimeout: 5000,
      ...options,
    }
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Listen to browser events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }

    // Start ping checks if configured
    if (this.options.pingUrl) {
      this.startPingChecks()
    }

    // Expose API
    this.api = {
      isOnline: () => this.isOnlineState,
      getConnectionType: this.getConnectionType.bind(this),
      getEffectiveType: this.getEffectiveType.bind(this),
      onStatusChange: this.onStatusChange.bind(this),
    }
  }

  uninstall(): void {
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }

    // Clear timers
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Clear handlers
    this.statusHandlers.clear()
  }

  /**
   * Handle online event.
   * @private
   */
  private handleOnline = (): void => {
    this.debounce(() => {
      if (this.isOnlineState !== true) {
        this.isOnlineState = true
        this.notifyStatusChange(true)
        if (this.kernel) {
          this.kernel.emit({ type: 'online', timestamp: Date.now() })
        }
      }
    })
  }

  /**
   * Handle offline event.
   * @private
   */
  private handleOffline = (): void => {
    this.debounce(() => {
      if (this.isOnlineState !== false) {
        this.isOnlineState = false
        this.notifyStatusChange(false)
        if (this.kernel) {
          this.kernel.emit({ type: 'offline', timestamp: Date.now() })
        }
      }
    })
  }

  /**
   * Debounce status changes to prevent rapid toggling.
   * @private
   */
  private debounce(fn: () => void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = window.setTimeout(fn, 300)
  }

  /**
   * Perform ping check.
   * @private
   */
  private async pingCheck(): Promise<void> {
    if (!this.options.pingUrl) {
      return
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.pingTimeout)

      await fetch(this.options.pingUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'no-cors', // Allow cross-origin ping
      })

      clearTimeout(timeout)

      // If we get here without error, we're online
      if (this.isOnlineState !== true) {
        this.isOnlineState = true
        this.notifyStatusChange(true)
        if (this.kernel) {
          this.kernel.emit({ type: 'online', timestamp: Date.now() })
        }
      }
    } catch (error) {
      // Network error = offline
      if (this.isOnlineState !== false) {
        this.isOnlineState = false
        this.notifyStatusChange(false)
        if (this.kernel) {
          this.kernel.emit({ type: 'offline', timestamp: Date.now() })
        }
      }
    }
  }

  /**
   * Start periodic ping checks.
   * @private
   */
  private startPingChecks(): void {
    if (this.pingTimer) {
      return
    }

    this.pingTimer = window.setInterval(() => {
      this.pingCheck()
    }, this.options.pingInterval)

    // Do initial ping check
    this.pingCheck()
  }

  /**
   * Get connection type from Network Information API.
   * @private
   */
  private getConnectionType(): ConnectionType | null {
    if (typeof navigator === 'undefined') {
      return null
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    return connection?.type || null
  }

  /**
   * Get effective connection type from Network Information API.
   * @private
   */
  private getEffectiveType(): EffectiveConnectionType | null {
    if (typeof navigator === 'undefined') {
      return null
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    return connection?.effectiveType || null
  }

  /**
   * Subscribe to status changes.
   * @private
   */
  private onStatusChange(handler: (online: boolean) => void): Unsubscribe {
    this.statusHandlers.add(handler)
    return () => {
      this.statusHandlers.delete(handler)
    }
  }

  /**
   * Notify all status change handlers.
   * @private
   */
  private notifyStatusChange(online: boolean): void {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(online)
      } catch (error) {
        console.error('Error in status change handler:', error)
      }
    })
  }
}

/**
 * Create network monitor plugin instance.
 */
export function networkMonitor(options?: NetworkMonitorOptions): NetworkMonitorPlugin {
  return new NetworkMonitorPlugin(options)
}
