# Vanilla JS Todo App with SyncKit

A simple offline-first todo application built with vanilla JavaScript and SyncKit.

## Features

- ✅ No framework dependencies
- ✅ Offline-first architecture
- ✅ Automatic background sync
- ✅ Optimistic updates
- ✅ Real-time sync status
- ✅ Debug panel

## Usage

Simply open `index.html` in your browser. No build step required!

```bash
open index.html
```

Or serve it with a local server:

```bash
npx serve .
```

## Integration with Real SyncKit

To use the actual SyncKit library instead of the simulation:

1. Install SyncKit:

```bash
npm install @oxog/synckit
```

2. Replace the `SimpleSyncKit` class with:

```javascript
import { createSyncKit } from '@oxog/synckit'

const sync = createSyncKit({
  name: 'vanilla-todo',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(`/api/${operation.resource}`, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(operation.payload),
    })
    return response.json()
  },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
  },
})

await sync.init()
```

3. Listen to events:

```javascript
// Subscribe to sync events
sync.on('sync-success', (event) => {
  console.log('Synced:', event.operation)
})

sync.on('sync-error', (event) => {
  console.error('Sync failed:', event.error)
})

sync.on('online', () => {
  console.log('Back online!')
})

sync.on('offline', () => {
  console.log('Gone offline')
})
```

## Testing Offline Behavior

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Add/edit/delete todos
4. Operations queue up
5. Go back online
6. Watch automatic sync!

## Learn More

- [SyncKit Documentation](https://synckit.oxog.dev)
- [Vanilla JS Guide](https://synckit.oxog.dev/docs/vanilla)
- [API Reference](https://synckit.oxog.dev/docs/api)
