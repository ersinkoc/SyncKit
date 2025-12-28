import type { EventType, KernelEvent, EventHandler, Unsubscribe } from '../types'

/**
 * Event bus for pub/sub communication between kernel and plugins.
 * Provides type-safe event handling with automatic cleanup.
 */
export class EventBus {
  private listeners: Map<EventType, Set<EventHandler<any>>>
  private anyListeners: Set<(event: KernelEvent) => void>

  constructor() {
    this.listeners = new Map()
    this.anyListeners = new Set()
  }

  /**
   * Subscribe to an event.
   *
   * @param eventType - Type of event to listen for
   * @param handler - Handler function
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = eventBus.on('online', (event) => {
   *   console.log('Back online at', event.timestamp)
   * })
   *
   * // Later:
   * unsubscribe()
   * ```
   */
  on<E extends EventType>(eventType: E, handler: EventHandler<E>): Unsubscribe {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }

    const handlers = this.listeners.get(eventType)!
    handlers.add(handler)

    // Return unsubscribe function (closure over eventType and handler)
    return () => {
      this.off(eventType, handler)
    }
  }

  /**
   * Unsubscribe from an event.
   *
   * @param eventType - Type of event
   * @param handler - Handler function to remove
   *
   * @example
   * ```ts
   * const handler = (event) => console.log(event)
   * eventBus.on('online', handler)
   * eventBus.off('online', handler)
   * ```
   */
  off<E extends EventType>(eventType: E, handler: EventHandler<E>): void {
    const handlers = this.listeners.get(eventType)
    if (handlers) {
      handlers.delete(handler)
      // Clean up empty sets
      if (handlers.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  /**
   * Subscribe to all events.
   *
   * @param handler - Handler function that receives any event
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = eventBus.onAny((event) => {
   *   console.log('Event:', event.type)
   * })
   * ```
   */
  onAny(handler: (event: KernelEvent) => void): Unsubscribe {
    this.anyListeners.add(handler)

    // Return unsubscribe function
    return () => {
      this.anyListeners.delete(handler)
    }
  }

  /**
   * Emit an event to all subscribed handlers.
   * Errors in handlers are caught and logged to prevent cascading failures.
   *
   * @param event - Event to emit
   *
   * @example
   * ```ts
   * eventBus.emit({
   *   type: 'online',
   *   timestamp: Date.now()
   * })
   * ```
   */
  emit(event: KernelEvent): void {
    // Call specific event type handlers
    const handlers = this.listeners.get(event.type)
    if (handlers && handlers.size > 0) {
      // Clone handlers set to avoid issues with modifications during iteration
      const handlersArray = Array.from(handlers)

      for (const handler of handlersArray) {
        try {
          handler(event)
        } catch (error) {
          // Log error but don't throw - one bad handler shouldn't break others
          console.error(`Error in event handler for '${event.type}':`, error)
        }
      }
    }

    // Call global 'any' event handlers
    if (this.anyListeners.size > 0) {
      const anyHandlersArray = Array.from(this.anyListeners)

      for (const handler of anyHandlersArray) {
        try {
          handler(event)
        } catch (error) {
          console.error(`Error in 'any' event handler:`, error)
        }
      }
    }
  }

  /**
   * Remove all event listeners.
   * Useful for cleanup when destroying the kernel.
   */
  clear(): void {
    this.listeners.clear()
    this.anyListeners.clear()
  }

  /**
   * Get count of listeners for an event type.
   * @param eventType - Event type
   * @returns Number of listeners
   */
  listenerCount(eventType: EventType): number {
    const handlers = this.listeners.get(eventType)
    return handlers ? handlers.size : 0
  }

  /**
   * Get all event types that have listeners.
   * @returns Array of event types
   */
  eventTypes(): EventType[] {
    return Array.from(this.listeners.keys())
  }
}
