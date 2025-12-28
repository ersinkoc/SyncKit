/**
 * SyncKit Service Worker Example
 *
 * This is a complete example of a service worker that integrates with SyncKit
 * for offline-first background synchronization.
 *
 * IMPORTANT: This file should be placed in your public directory
 * (e.g., public/sw.js) and registered from your main application.
 */

// Import SyncKit service worker utilities
// Note: Adjust the import path based on your build configuration
importScripts('https://unpkg.com/@oxog/synckit@latest/dist/sw/index.js')

// Configuration
const CACHE_NAME = 'synckit-app-v1'
const SW_TAG_PREFIX = 'synckit-sync'

/**
 * Custom sync executor function.
 * This function is called when background sync is triggered.
 * Customize this to match your API structure.
 */
async function syncExecutor(operations) {
  const results = []

  for (const operation of operations) {
    try {
      // Build the API URL
      const url = `/api/${operation.resource}`

      // Send the operation to your backend
      const response = await fetch(url, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(operation.payload),
      })

      // Check if request was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Parse and store the result
      const result = await response.json()
      results.push(result)

      console.log(`[SyncKit SW] Synced operation ${operation.id} successfully`)
    } catch (error) {
      console.error(`[SyncKit SW] Failed to sync operation ${operation.id}:`, error)

      // Re-throw error to trigger retry mechanism
      // The Background Sync API will retry automatically
      throw error
    }
  }

  return results
}

/**
 * Set up SyncKit service worker handlers.
 * Uses the imported utilities from @oxog/synckit/sw
 */
if (typeof setupSWHandlers !== 'undefined') {
  setupSWHandlers({
    tagPrefix: SW_TAG_PREFIX,
    onSync: createDefaultSyncHandler(syncExecutor),
    enableLogging: true, // Set to false in production
  })
} else {
  console.error('[SyncKit SW] setupSWHandlers not available. Make sure to import @oxog/synckit/sw')
}

/**
 * Install event - cache essential resources.
 */
self.addEventListener('install', (event) => {
  console.log('[SyncKit SW] Installing service worker...')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/script.js',
        // Add other essential resources
      ])
    })
  )

  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

/**
 * Activate event - clean up old caches.
 */
self.addEventListener('activate', (event) => {
  console.log('[SyncKit SW] Activating service worker...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )

  // Take control of all clients immediately
  return self.clients.claim()
})

/**
 * Fetch event - serve from cache with network fallback.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response
      }

      // Otherwise fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    })
  )
})

/**
 * Message event - handle messages from main thread.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/**
 * Background Sync event - triggered when connection is restored.
 * This is handled by setupSWHandlers above, but you can add
 * additional logic here if needed.
 */
self.addEventListener('sync', (event) => {
  console.log('[SyncKit SW] Sync event triggered:', event.tag)
})

console.log('[SyncKit SW] Service worker loaded successfully')
