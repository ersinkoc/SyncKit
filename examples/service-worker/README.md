# SyncKit Service Worker Example

This example demonstrates how to set up a service worker with SyncKit for offline-first background synchronization.

## Files

- `sw.js` - Complete service worker implementation with SyncKit integration
- `index.html` - Example HTML page that registers the service worker
- `app.js` - Example application code using SyncKit

## Setup

### 1. Copy the Service Worker

Copy `sw.js` to your `public` directory:

```bash
cp examples/service-worker/sw.js public/sw.js
```

### 2. Register the Service Worker

In your main application file:

```javascript
import { registerServiceWorker } from '@oxog/synckit/sw'

// Register the service worker
const registration = await registerServiceWorker({
  swPath: '/sw.js',
  scope: '/',
  onRegistered: (reg) => {
    console.log('Service Worker registered:', reg)
  },
  onError: (error) => {
    console.error('Service Worker registration failed:', error)
  },
  onUpdated: (reg) => {
    console.log('Service Worker updated:', reg)
    // Optionally prompt user to reload
    if (confirm('New version available! Reload to update?')) {
      window.location.reload()
    }
  },
})
```

### 3. Use SyncKit with Background Sync

```javascript
import { createSyncKit } from '@oxog/synckit'
import { backgroundSyncPlugin } from '@oxog/synckit/plugins'

// Create SyncKit instance
const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    // This will run in the main thread when online
    const response = await fetch(`/api/${operation.resource}`, {
      method: operation.method,
      body: JSON.stringify(operation.payload),
    })
    return response.json()
  },
})

// Register background sync plugin (optional but recommended)
sync.register(backgroundSyncPlugin({
  swRegistration: registration,
  tagPrefix: 'synckit-sync',
}))

// Initialize
await sync.init()

// Now you can push operations - they'll sync in the background!
sync.push({
  resource: 'users',
  method: 'POST',
  payload: {
    name: 'John Doe',
    email: 'john@example.com',
  },
})
```

## How It Works

1. **Main Thread**: When you push an operation using `sync.push()`, it's added to IndexedDB
2. **Offline Detection**: If the user is offline, the operation stays in the queue
3. **Background Sync**: When the user goes back online, the browser triggers a sync event
4. **Service Worker**: The SW receives the sync event and processes queued operations
5. **Sync Executor**: Your custom `syncExecutor` function sends operations to your API
6. **Result**: Operations are marked as synced and removed from the queue

## Benefits

- **True Background Sync**: Operations sync even if the app is closed
- **Automatic Retry**: Failed operations are automatically retried by the browser
- **Battery Efficient**: Browser optimizes sync timing to save battery
- **Offline-First**: Users can continue working offline seamlessly

## Testing

### Test Offline Behavior

1. Open DevTools → Application → Service Workers
2. Check "Offline" to simulate offline mode
3. Push some operations (they'll be queued)
4. Uncheck "Offline" to go back online
5. Watch the operations sync automatically!

### Test Background Sync

1. Open DevTools → Application → Background Sync
2. You should see sync events registered with the tag prefix
3. Trigger a sync manually or wait for the browser to sync

## Browser Support

Background Sync API is supported in:
- Chrome/Edge 49+
- Opera 36+
- Samsung Internet 5.0+

For browsers without Background Sync support, SyncKit will fall back to syncing operations immediately when online.

## Production Considerations

### 1. Authentication

Add authentication headers in the service worker:

```javascript
async function syncExecutor(operations) {
  for (const operation of operations) {
    const response = await fetch(`/api/${operation.resource}`, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`, // Implement getAuthToken()
      },
      body: JSON.stringify(operation.payload),
    })
    // ...
  }
}
```

### 2. Error Handling

Customize error handling for different scenarios:

```javascript
async function syncExecutor(operations) {
  for (const operation of operations) {
    try {
      const response = await fetch(/* ... */)

      if (response.status === 401) {
        // Authentication error - notify user
        await messageAllClients({
          type: 'AUTH_ERROR',
          message: 'Please log in again',
        })
        throw new Error('Authentication required')
      }

      if (response.status === 409) {
        // Conflict error - let SyncKit handle it
        throw new Error('Conflict detected')
      }

      // Handle other errors...
    } catch (error) {
      console.error('Sync failed:', error)
      throw error // Retry
    }
  }
}
```

### 3. Logging

Disable logging in production:

```javascript
setupSWHandlers({
  tagPrefix: SW_TAG_PREFIX,
  onSync: createDefaultSyncHandler(syncExecutor),
  enableLogging: process.env.NODE_ENV !== 'production',
})
```

### 4. Cache Strategy

Customize the caching strategy based on your needs:

```javascript
// Cache-first for static assets
if (event.request.url.includes('/static/')) {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
}

// Network-first for API calls
if (event.request.url.includes('/api/')) {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  )
}
```

## Troubleshooting

### Operations Not Syncing

1. Check if service worker is registered: DevTools → Application → Service Workers
2. Check if IndexedDB has operations: DevTools → Application → IndexedDB → synckit
3. Check browser console for errors
4. Verify Background Sync events: DevTools → Application → Background Sync

### Service Worker Not Updating

1. Clear service worker cache
2. Unregister old service worker
3. Hard reload (Ctrl+Shift+R)
4. Check update strategy in `registerServiceWorker` options

## Learn More

- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [SyncKit Documentation](https://synckit.oxog.dev)
