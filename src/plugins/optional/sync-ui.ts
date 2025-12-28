import type { Plugin, SyncKit, KernelEvent } from '../../types'

/**
 * UI notification type.
 */
export interface UINotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timestamp: number
  duration?: number
}

/**
 * UI state for sync operations.
 */
export interface UIState {
  /**
   * Is any sync operation in progress?
   */
  isSyncing: boolean

  /**
   * Number of operations currently syncing.
   */
  syncingCount: number

  /**
   * Sync progress (0-100).
   */
  progress: number

  /**
   * Active notifications.
   */
  notifications: UINotification[]

  /**
   * Last sync timestamp.
   */
  lastSync?: number

  /**
   * Last error.
   */
  lastError?: Error
}

/**
 * Sync UI options.
 */
export interface SyncUIOptions {
  /**
   * Show success notifications.
   * @default true
   */
  showSuccess?: boolean

  /**
   * Show error notifications.
   * @default true
   */
  showErrors?: boolean

  /**
   * Show retry notifications.
   * @default false
   */
  showRetries?: boolean

  /**
   * Notification duration (ms).
   * @default 5000
   */
  notificationDuration?: number

  /**
   * Maximum number of notifications to keep.
   * @default 5
   */
  maxNotifications?: number

  /**
   * Custom message formatter.
   */
  formatMessage?: (event: KernelEvent) => string | null
}

/**
 * Sync UI API exposed to users.
 */
export interface SyncUIAPI {
  /**
   * Get current UI state.
   */
  getState(): UIState

  /**
   * Subscribe to UI state changes.
   */
  subscribe(callback: (state: UIState) => void): () => void

  /**
   * Add custom notification.
   */
  addNotification(notification: Omit<UINotification, 'id' | 'timestamp'>): void

  /**
   * Remove notification by ID.
   */
  removeNotification(id: string): void

  /**
   * Clear all notifications.
   */
  clearNotifications(): void
}

/**
 * Sync UI Plugin - provides UI state for sync operations.
 * Optional plugin (user must register manually).
 * Framework-agnostic - works with any UI framework.
 */
export class SyncUIPlugin implements Plugin {
  name = 'sync-ui'
  version = '1.0.0'
  type = 'optional' as const

  private kernel?: SyncKit
  private options: Required<Omit<SyncUIOptions, 'formatMessage'>> &
    Pick<SyncUIOptions, 'formatMessage'>
  private state: UIState = {
    isSyncing: false,
    syncingCount: 0,
    progress: 0,
    notifications: [],
  }
  private subscribers: Set<(state: UIState) => void> = new Set()
  private notificationTimers: Map<string, number> = new Map()
  api!: SyncUIAPI

  constructor(options: SyncUIOptions = {}) {
    this.options = {
      showSuccess: options.showSuccess ?? true,
      showErrors: options.showErrors ?? true,
      showRetries: options.showRetries ?? false,
      notificationDuration: options.notificationDuration || 5000,
      maxNotifications: options.maxNotifications || 5,
      formatMessage: options.formatMessage,
    }
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Subscribe to all events
    this.kernel.onAny((event) => {
      this.handleEvent(event)
    })

    // Expose API
    this.api = {
      getState: this.getState.bind(this),
      subscribe: this.subscribe.bind(this),
      addNotification: this.addNotification.bind(this),
      removeNotification: this.removeNotification.bind(this),
      clearNotifications: this.clearNotifications.bind(this),
    }
  }

  async uninstall(): Promise<void> {
    this.subscribers.clear()
    this.notificationTimers.forEach((timer) => clearTimeout(timer))
    this.notificationTimers.clear()
  }

  /**
   * Handle sync events and update UI state.
   * @private
   */
  private handleEvent(event: KernelEvent): void {
    switch (event.type) {
      case 'sync-start':
        this.state.isSyncing = true
        this.state.syncingCount++
        this.updateProgress()
        this.notifySubscribers()
        break

      case 'sync-success':
        this.state.syncingCount = Math.max(0, this.state.syncingCount - 1)
        this.state.isSyncing = this.state.syncingCount > 0
        this.state.lastSync = event.timestamp
        this.updateProgress()

        if (this.options.showSuccess) {
          const message =
            this.options.formatMessage?.(event) || `Synced ${(event as any).operation.resource}`
          this.addNotification({
            type: 'success',
            message,
          })
        }

        this.notifySubscribers()
        break

      case 'sync-error':
        this.state.syncingCount = Math.max(0, this.state.syncingCount - 1)
        this.state.isSyncing = this.state.syncingCount > 0
        this.state.lastError = (event as any).error
        this.updateProgress()

        if (this.options.showErrors) {
          const message =
            this.options.formatMessage?.(event) ||
            `Error syncing ${(event as any).operation.resource}: ${(event as any).error.message}`
          this.addNotification({
            type: 'error',
            message,
          })
        }

        this.notifySubscribers()
        break

      case 'retry':
        if (this.options.showRetries) {
          const message =
            this.options.formatMessage?.(event) ||
            `Retrying ${(event as any).operation.resource} (attempt ${(event as any).attempt})`
          this.addNotification({
            type: 'info',
            message,
          })
        }
        break

      case 'conflict':
        const message =
          this.options.formatMessage?.(event) ||
          `Conflict detected for ${(event as any).operation.resource}`
        this.addNotification({
          type: 'warning',
          message,
        })
        this.notifySubscribers()
        break

      case 'online':
        this.addNotification({
          type: 'success',
          message: 'Back online',
        })
        this.notifySubscribers()
        break

      case 'offline':
        this.addNotification({
          type: 'warning',
          message: 'You are offline',
        })
        this.notifySubscribers()
        break
    }
  }

  /**
   * Update progress based on queue status.
   * @private
   */
  private updateProgress(): void {
    if (!this.kernel) {
      return
    }

    const status = this.kernel.getStatus()
    const total = status.pending + status.failed + status.total

    if (total === 0) {
      this.state.progress = 0
    } else {
      const completed = status.total - status.pending - status.failed
      this.state.progress = Math.round((completed / total) * 100)
    }
  }

  /**
   * Get current UI state.
   * @private
   */
  private getState(): UIState {
    return { ...this.state }
  }

  /**
   * Subscribe to UI state changes.
   * @private
   */
  private subscribe(callback: (state: UIState) => void): () => void {
    this.subscribers.add(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Add notification.
   * @private
   */
  private addNotification(notification: Omit<UINotification, 'id' | 'timestamp'>): void {
    const id = `notification-${Date.now()}-${Math.random()}`
    const fullNotification: UINotification = {
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? this.options.notificationDuration,
      ...notification,
    }

    this.state.notifications.push(fullNotification)

    // Trim to max notifications
    if (this.state.notifications.length > this.options.maxNotifications) {
      const removed = this.state.notifications.shift()
      if (removed) {
        const timer = this.notificationTimers.get(removed.id)
        if (timer) {
          clearTimeout(timer)
          this.notificationTimers.delete(removed.id)
        }
      }
    }

    // Auto-remove after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      const timer = window.setTimeout(() => {
        this.removeNotification(id)
      }, fullNotification.duration)

      this.notificationTimers.set(id, timer)
    }

    this.notifySubscribers()
  }

  /**
   * Remove notification by ID.
   * @private
   */
  private removeNotification(id: string): void {
    this.state.notifications = this.state.notifications.filter((n) => n.id !== id)

    const timer = this.notificationTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.notificationTimers.delete(id)
    }

    this.notifySubscribers()
  }

  /**
   * Clear all notifications.
   * @private
   */
  private clearNotifications(): void {
    this.state.notifications = []
    this.notificationTimers.forEach((timer) => clearTimeout(timer))
    this.notificationTimers.clear()
    this.notifySubscribers()
  }

  /**
   * Notify all subscribers of state change.
   * @private
   */
  private notifySubscribers(): void {
    const state = this.getState()
    this.subscribers.forEach((callback) => {
      try {
        callback(state)
      } catch (error) {
        console.error('Error in sync-ui subscriber:', error)
      }
    })
  }
}

/**
 * Create sync UI plugin instance.
 */
export function syncUIPlugin(options?: SyncUIOptions): SyncUIPlugin {
  return new SyncUIPlugin(options)
}
