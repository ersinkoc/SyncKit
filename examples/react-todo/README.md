# React Todo App with SyncKit

A complete offline-first todo application built with React and SyncKit.

## Features

- ✅ Offline-first architecture
- ✅ Automatic background sync
- ✅ Optimistic updates
- ✅ Conflict resolution
- ✅ Failed operation handling
- ✅ Real-time sync status
- ✅ Priority-based operations
- ✅ Debug panel

## Installation

```bash
npm install @oxog/synckit react react-dom
```

## Usage

```tsx
import App from './App'
import './styles.css'

// Render the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

## How It Works

### 1. SyncKitProvider

Wraps the entire app and provides SyncKit context:

```tsx
<SyncKitProvider
  config={{
    name: 'todo-app',
    storage: 'indexeddb',
    executor: async (operation) => {
      // Your API call here
      const response = await fetch(`/api/${operation.resource}`, {
        method: operation.method,
        body: JSON.stringify(operation.payload),
      })
      return response.json()
    },
  }}
>
  <TodoApp />
</SyncKitProvider>
```

### 2. useSync Hook

Push operations to the sync queue:

```tsx
const { push, remove } = useSync()

// Add todo
const result = push({
  resource: 'todos',
  method: 'POST',
  payload: newTodo,
})

// Rollback on error
result.rollback = () => {
  // Revert optimistic update
}
```

### 3. useSyncStatus Hook

Track sync queue status:

```tsx
const { pending, syncing, failed, total, isIdle } = useSyncStatus()

return (
  <div>
    <span>Pending: {pending}</span>
    <span>Syncing: {syncing}</span>
    <span>Failed: {failed}</span>
  </div>
)
```

### 4. useOnline Hook

Monitor network status:

```tsx
const { isOnline, networkType, effectiveType } = useOnline()

return (
  <div className={isOnline ? 'online' : 'offline'}>
    {isOnline ? 'Online' : 'Offline'}
  </div>
)
```

### 5. useSyncQueue Hook

Access full queue details:

```tsx
const { operations, pendingOperations, failedOperations } = useSyncQueue()

return (
  <div>
    {operations.map(op => (
      <div key={op.id}>
        {op.resource} - {op.status}
      </div>
    ))}
  </div>
)
```

## Optimistic Updates

SyncKit enables optimistic UI updates with rollback support:

```tsx
const handleAdd = (todo) => {
  // 1. Update UI immediately
  setTodos(prev => [...prev, todo])

  // 2. Queue for sync
  const result = push({
    resource: 'todos',
    method: 'POST',
    payload: todo,
  })

  // 3. Rollback if sync fails
  result.rollback = () => {
    setTodos(prev => prev.filter(t => t.id !== todo.id))
  }
}
```

## Conflict Resolution

Configure how conflicts are handled:

```tsx
<SyncKitProvider
  config={{
    conflictStrategy: 'last-write-wins', // or 'server-wins', 'client-wins', 'manual'
    onConflict: (local, server) => {
      // Custom resolution logic
      return { ...server, ...local }
    },
  }}
>
```

## Error Handling

Handle failed operations gracefully:

```tsx
const { failedOperations } = useSyncQueue()

return (
  <div>
    {failedOperations.map(op => (
      <div key={op.id}>
        <span>{op.lastError}</span>
        <button onClick={() => retry(op.id)}>Retry</button>
        <button onClick={() => remove(op.id)}>Dismiss</button>
      </div>
    ))}
  </div>
)
```

## Testing Offline Behavior

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Add/edit/delete todos
4. Operations queue up
5. Go back online
6. Watch automatic sync!

## Advanced Features

### Analytics

Track sync metrics:

```tsx
import { analyticsPlugin } from '@oxog/synckit/plugins'

<SyncKitProvider
  plugins={[analyticsPlugin()]}
  config={{...}}
>
```

Access metrics:

```tsx
const analytics = kernel.getPlugin('analytics')
const metrics = analytics.api.getMetrics()

console.log(metrics.totalSynced)
console.log(metrics.successRate)
console.log(metrics.avgSyncTime)
```

### Batching

Batch operations for efficiency:

```tsx
import { batchingPlugin } from '@oxog/synckit/plugins'

<SyncKitProvider
  plugins={[
    batchingPlugin({
      maxBatchSize: 10,
      batchWindow: 2000,
    })
  ]}
>
```

### Encryption

Encrypt sensitive data:

```tsx
import { encryptionPlugin } from '@oxog/synckit/plugins'

<SyncKitProvider
  plugins={[
    encryptionPlugin({
      key: 'your-encryption-key',
      salt: 'your-salt',
    })
  ]}
>
```

## Production Checklist

- [ ] Set up real API endpoints
- [ ] Configure authentication
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Enable service worker for background sync
- [ ] Add retry limits for failed operations
- [ ] Implement conflict resolution strategy
- [ ] Add loading states for sync operations
- [ ] Test offline scenarios thoroughly
- [ ] Monitor sync queue performance
- [ ] Set up analytics dashboard

## Learn More

- [SyncKit Documentation](https://synckit.oxog.dev)
- [React Hooks API](https://synckit.oxog.dev/docs/react)
- [Conflict Resolution Guide](https://synckit.oxog.dev/docs/conflicts)
- [Service Worker Setup](https://synckit.oxog.dev/docs/service-worker)
