/**
 * Service Worker Registration Utilities.
 * Provides helpers for registering and managing service workers.
 */

/**
 * Service worker registration options.
 */
export interface SWRegistrationOptions {
  /**
   * Path to the service worker file.
   * @default '/sw.js'
   */
  swPath?: string

  /**
   * Scope for the service worker.
   * @default '/'
   */
  scope?: string

  /**
   * Update check strategy.
   * @default 'lazy'
   */
  updateViaCache?: 'imports' | 'all' | 'none'

  /**
   * Called when service worker is registered.
   */
  onRegistered?: (registration: ServiceWorkerRegistration) => void

  /**
   * Called when service worker registration fails.
   */
  onError?: (error: Error) => void

  /**
   * Called when a new service worker is found.
   */
  onUpdateFound?: (registration: ServiceWorkerRegistration) => void

  /**
   * Called when a new service worker becomes active.
   */
  onUpdated?: (registration: ServiceWorkerRegistration) => void

  /**
   * Auto-update interval (ms).
   * Set to 0 to disable auto-update.
   * @default 3600000 (1 hour)
   */
  autoUpdateInterval?: number
}

/**
 * Register a service worker.
 */
export async function registerServiceWorker(
  options: SWRegistrationOptions = {}
): Promise<ServiceWorkerRegistration | null> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported in this browser')
    return null
  }

  const {
    swPath = '/sw.js',
    scope = '/',
    updateViaCache = 'none',
    onRegistered,
    onError,
    onUpdateFound,
    onUpdated,
    autoUpdateInterval = 3600000,
  } = options

  try {
    const registration = await navigator.serviceWorker.register(swPath, {
      scope,
      updateViaCache,
    })

    // Handle update found
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            onUpdated?.(registration)
          }
        })
      }

      onUpdateFound?.(registration)
    })

    // Auto-update check
    if (autoUpdateInterval > 0) {
      setInterval(
        () => {
          registration.update().catch((error) => {
            console.error('Failed to check for service worker updates:', error)
          })
        },
        autoUpdateInterval
      )
    }

    onRegistered?.(registration)
    return registration
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    onError?.(err)
    console.error('Service worker registration failed:', err)
    return null
  }
}

/**
 * Unregister a service worker.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.unregister()
  } catch (error) {
    console.error('Service worker unregistration failed:', error)
    return false
  }
}

/**
 * Wait for service worker to be ready.
 */
export async function waitForServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    return await navigator.serviceWorker.ready
  } catch (error) {
    console.error('Error waiting for service worker:', error)
    return null
  }
}

/**
 * Check if service worker is registered.
 */
export async function isServiceWorkerRegistered(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    return !!registration
  } catch {
    return false
  }
}

/**
 * Update service worker.
 */
export async function updateServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.update()
    return registration
  } catch (error) {
    console.error('Service worker update failed:', error)
    return null
  }
}

/**
 * Skip waiting and activate new service worker immediately.
 */
export function skipWaiting(): void {
  if (!('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
}

/**
 * Claim clients for the active service worker.
 */
export function claimClients(): void {
  if (!('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'CLAIM_CLIENTS' })
}
