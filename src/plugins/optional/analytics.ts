import type { Plugin, SyncKit, KernelEvent, Operation } from '../../types'

/**
 * Analytics metric.
 */
export interface AnalyticsMetric {
  /**
   * Total operations queued.
   */
  totalQueued: number

  /**
   * Total operations synced successfully.
   */
  totalSynced: number

  /**
   * Total operations failed.
   */
  totalFailed: number

  /**
   * Total retries attempted.
   */
  totalRetries: number

  /**
   * Total conflicts detected.
   */
  totalConflicts: number

  /**
   * Average sync time (ms).
   */
  avgSyncTime: number

  /**
   * Sync success rate (0-1).
   */
  successRate: number

  /**
   * Error rate (0-1).
   */
  errorRate: number

  /**
   * Errors by type.
   */
  errorsByType: Record<string, number>

  /**
   * Operations by resource.
   */
  operationsByResource: Record<string, number>

  /**
   * Network uptime percentage (0-1).
   */
  networkUptime: number
}

/**
 * Analytics event.
 */
export interface AnalyticsEvent {
  timestamp: number
  type: string
  data: unknown
}

/**
 * Analytics options.
 */
export interface AnalyticsOptions {
  /**
   * Track all events.
   * @default true
   */
  trackEvents?: boolean

  /**
   * Maximum number of events to keep.
   * @default 1000
   */
  maxEvents?: number

  /**
   * Custom analytics handler.
   * Called for each event.
   */
  onEvent?: (event: AnalyticsEvent) => void

  /**
   * Metric aggregation interval (ms).
   * @default 60000 (1 minute)
   */
  aggregationInterval?: number

  /**
   * Enable performance tracking.
   * @default true
   */
  trackPerformance?: boolean
}

/**
 * Analytics API exposed to users.
 */
export interface AnalyticsAPI {
  /**
   * Get current metrics.
   */
  getMetrics(): AnalyticsMetric

  /**
   * Get all tracked events.
   */
  getEvents(): AnalyticsEvent[]

  /**
   * Clear all events.
   */
  clearEvents(): void

  /**
   * Reset metrics.
   */
  resetMetrics(): void

  /**
   * Export analytics data.
   */
  exportData(): {
    metrics: AnalyticsMetric
    events: AnalyticsEvent[]
  }
}

/**
 * Analytics Plugin - tracks metrics and events for sync operations.
 * Optional plugin (user must register manually).
 */
export class AnalyticsPlugin implements Plugin {
  name = 'analytics'
  version = '1.0.0'
  type = 'optional' as const

  private kernel?: SyncKit
  private options: Required<Omit<AnalyticsOptions, 'onEvent'>> &
    Pick<AnalyticsOptions, 'onEvent'>
  private metrics: AnalyticsMetric = {
    totalQueued: 0,
    totalSynced: 0,
    totalFailed: 0,
    totalRetries: 0,
    totalConflicts: 0,
    avgSyncTime: 0,
    successRate: 0,
    errorRate: 0,
    errorsByType: {},
    operationsByResource: {},
    networkUptime: 1,
  }
  private events: AnalyticsEvent[] = []
  private syncTimes: number[] = []
  private operationStartTimes: Map<string, number> = new Map()
  private networkOnlineTime = 0
  private networkTotalTime = 0
  private lastNetworkChange = Date.now()
  private aggregationTimer?: number
  api!: AnalyticsAPI

  constructor(options: AnalyticsOptions = {}) {
    this.options = {
      trackEvents: options.trackEvents ?? true,
      maxEvents: options.maxEvents || 1000,
      onEvent: options.onEvent,
      aggregationInterval: options.aggregationInterval || 60000,
      trackPerformance: options.trackPerformance ?? true,
    }
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Subscribe to all events
    this.kernel.onAny((event) => {
      this.handleEvent(event)
    })

    // Start aggregation timer
    if (this.options.aggregationInterval > 0) {
      this.aggregationTimer = window.setInterval(() => {
        this.aggregateMetrics()
      }, this.options.aggregationInterval)
    }

    // Expose API
    this.api = {
      getMetrics: this.getMetrics.bind(this),
      getEvents: this.getEvents.bind(this),
      clearEvents: this.clearEvents.bind(this),
      resetMetrics: this.resetMetrics.bind(this),
      exportData: this.exportData.bind(this),
    }
  }

  async uninstall(): Promise<void> {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
    }
  }

  /**
   * Handle sync events and track analytics.
   * @private
   */
  private handleEvent(event: KernelEvent): void {
    // Track event
    if (this.options.trackEvents) {
      this.trackEvent({
        timestamp: event.timestamp,
        type: event.type,
        data: event,
      })
    }

    // Update metrics based on event type
    switch (event.type) {
      case 'push':
        this.metrics.totalQueued++
        this.trackOperationByResource((event as any).operation)
        break

      case 'sync-start':
        if (this.options.trackPerformance) {
          this.operationStartTimes.set((event as any).operation.id, Date.now())
        }
        break

      case 'sync-success':
        this.metrics.totalSynced++
        if (this.options.trackPerformance) {
          this.trackSyncTime((event as any).operation)
        }
        break

      case 'sync-error':
        this.metrics.totalFailed++
        this.trackError((event as any).error)
        break

      case 'retry':
        this.metrics.totalRetries++
        break

      case 'conflict':
        this.metrics.totalConflicts++
        break

      case 'online':
        this.trackNetworkChange(true)
        break

      case 'offline':
        this.trackNetworkChange(false)
        break
    }
  }

  /**
   * Track an analytics event.
   * @private
   */
  private trackEvent(event: AnalyticsEvent): void {
    this.events.push(event)

    // Trim to max events
    if (this.events.length > this.options.maxEvents) {
      this.events.shift()
    }

    // Call custom handler
    if (this.options.onEvent) {
      try {
        this.options.onEvent(event)
      } catch (error) {
        console.error('Error in analytics event handler:', error)
      }
    }
  }

  /**
   * Track operation by resource.
   * @private
   */
  private trackOperationByResource(operation: Operation): void {
    const resource = operation.resource
    this.metrics.operationsByResource[resource] =
      (this.metrics.operationsByResource[resource] || 0) + 1
  }

  /**
   * Track sync time for an operation.
   * @private
   */
  private trackSyncTime(operation: Operation): void {
    const startTime = this.operationStartTimes.get(operation.id)
    if (!startTime) {
      return
    }

    const duration = Date.now() - startTime
    this.syncTimes.push(duration)

    // Keep last 100 sync times for averaging
    if (this.syncTimes.length > 100) {
      this.syncTimes.shift()
    }

    this.operationStartTimes.delete(operation.id)
  }

  /**
   * Track error by type.
   * @private
   */
  private trackError(error: Error): void {
    const errorType = error.name || 'Unknown'
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1
  }

  /**
   * Track network status change.
   * @private
   */
  private trackNetworkChange(_online: boolean): void {
    const now = Date.now()
    const duration = now - this.lastNetworkChange

    if (navigator.onLine) {
      this.networkOnlineTime += duration
    }

    this.networkTotalTime += duration
    this.lastNetworkChange = now

    // Update uptime percentage
    if (this.networkTotalTime > 0) {
      this.metrics.networkUptime = this.networkOnlineTime / this.networkTotalTime
    }
  }

  /**
   * Aggregate metrics.
   * @private
   */
  private aggregateMetrics(): void {
    // Calculate average sync time
    if (this.syncTimes.length > 0) {
      const sum = this.syncTimes.reduce((acc, time) => acc + time, 0)
      this.metrics.avgSyncTime = sum / this.syncTimes.length
    }

    // Calculate success rate
    const total = this.metrics.totalSynced + this.metrics.totalFailed
    if (total > 0) {
      this.metrics.successRate = this.metrics.totalSynced / total
      this.metrics.errorRate = this.metrics.totalFailed / total
    }
  }

  /**
   * Get current metrics.
   * @private
   */
  private getMetrics(): AnalyticsMetric {
    this.aggregateMetrics()
    return { ...this.metrics }
  }

  /**
   * Get all tracked events.
   * @private
   */
  private getEvents(): AnalyticsEvent[] {
    return [...this.events]
  }

  /**
   * Clear all events.
   * @private
   */
  private clearEvents(): void {
    this.events = []
  }

  /**
   * Reset metrics.
   * @private
   */
  private resetMetrics(): void {
    this.metrics = {
      totalQueued: 0,
      totalSynced: 0,
      totalFailed: 0,
      totalRetries: 0,
      totalConflicts: 0,
      avgSyncTime: 0,
      successRate: 0,
      errorRate: 0,
      errorsByType: {},
      operationsByResource: {},
      networkUptime: 1,
    }
    this.syncTimes = []
    this.operationStartTimes.clear()
    this.networkOnlineTime = 0
    this.networkTotalTime = 0
    this.lastNetworkChange = Date.now()
  }

  /**
   * Export analytics data.
   * @private
   */
  private exportData(): { metrics: AnalyticsMetric; events: AnalyticsEvent[] } {
    return {
      metrics: this.getMetrics(),
      events: this.getEvents(),
    }
  }
}

/**
 * Create analytics plugin instance.
 */
export function analyticsPlugin(options?: AnalyticsOptions): AnalyticsPlugin {
  return new AnalyticsPlugin(options)
}
