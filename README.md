# SyncKit

> Zero-dependency offline-first data sync toolkit with micro-kernel plugin architecture

[![npm version](https://img.shields.io/npm/v/@oxog/synckit.svg)](https://www.npmjs.com/package/@oxog/synckit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@oxog/synckit)](https://bundlephobia.com/package/@oxog/synckit)

SyncKit is a comprehensive offline-first synchronization solution for web applications. It queues operations when offline, automatically syncs when back online, handles conflicts with multiple resolution strategies, supports optimistic updates, and persists the queue to IndexedDB—all without any runtime dependencies.

## Features

✨ **Offline-First**: Queue operations when offline, auto-sync when back online
🔄 **Conflict Resolution**: Multiple strategies (last-write-wins, server-wins, client-wins, manual, custom)
⚡ **Optimistic Updates**: Apply changes immediately with rollback capability
🎯 **Priority Queue**: Critical operations processed first
🔁 **Automatic Retry**: Configurable backoff strategies (exponential, linear, fibonacci)
💾 **Persistent Storage**: IndexedDB for reliable queue persistence
🧩 **Plugin Architecture**: Micro-kernel design with powerful plugin system
⚛️ **Framework Adapters**: First-class support for React, Vue, and Svelte
📦 **Zero Dependencies**: Everything implemented from scratch
🔒 **Type-Safe**: Full TypeScript support with strict mode
🌳 **Tree-Shakeable**: Only bundle what you use

## Installation

```bash
npm install @oxog/synckit
```

```bash
yarn add @oxog/synckit
```

```bash
pnpm add @oxog/synckit
```

## Quick Start

```typescript
import { createSyncKit } from '@oxog/synckit'

// Create instance
const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(`/api/${operation.resource}`, {
      method: operation.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload)
    })
    return response.json()
  },
  conflictStrategy: 'last-write-wins',
  retry: {
    maxAttempts: 5,
    backoff: 'exponential'
  }
})

// Initialize
await sync.init()

// Push operations
const { operationId, rollback } = sync.push({
  resource: 'posts',
  method: 'POST',
  payload: { title: 'Hello', body: 'World' },
  priority: 'high',
  optimistic: true,
  onSuccess: (result) => console.log('Synced!', result),
  onError: (error) => {
    console.error('Failed:', error)
    rollback() // Revert optimistic update
  }
})

// Listen to events
sync.on('sync-success', (event) => {
  console.log('Operation synced:', event.operation)
})

sync.on('offline', () => {
  console.log('Gone offline, operations will be queued')
})

sync.on('online', () => {
  console.log('Back online, syncing queued operations')
})

// Check status
const status = sync.getStatus()
console.log(`${status.pending} pending, ${status.failed} failed`)
```

## Framework Integration

### React

```tsx
import { SyncKitProvider, useSync, useSyncStatus } from '@oxog/synckit/react'

function App() {
  return (
    <SyncKitProvider config={{ name: 'my-app', storage: 'indexeddb', executor: ... }}>
      <MyApp />
    </SyncKitProvider>
  )
}

function CreatePost() {
  const { push, isOnline } = useSync()
  const { pending, failed } = useSyncStatus()

  const handleSubmit = (data) => {
    push({
      resource: 'posts',
      method: 'POST',
      payload: data,
      optimistic: true
    })
  }

  return (
    <div>
      {!isOnline && <Badge>Offline</Badge>}
      {pending > 0 && <Badge>{pending} pending</Badge>}
      <form onSubmit={handleSubmit}>...</form>
    </div>
  )
}
```

### Vue

```vue
<script setup>
import { useSync, useSyncStatus } from '@oxog/synckit/vue'

const { push, isOnline } = useSync()
const { pending, failed } = useSyncStatus()

const handleSubmit = (data) => {
  push({
    resource: 'posts',
    method: 'POST',
    payload: data
  })
}
</script>

<template>
  <div>
    <span v-if="!isOnline">Offline</span>
    <span v-if="pending > 0">{{ pending }} pending</span>
    <form @submit.prevent="handleSubmit">...</form>
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { syncStore, statusStore, onlineStore } from '@oxog/synckit/svelte'

  function handleSubmit(data) {
    $syncStore.push({
      resource: 'posts',
      method: 'POST',
      payload: data
    })
  }
</script>

{#if !$onlineStore}
  <span>Offline</span>
{/if}

{#if $statusStore.pending > 0}
  <span>{$statusStore.pending} pending</span>
{/if}

<form on:submit|preventDefault={handleSubmit}>...</form>
```

## Core Concepts

### Offline-First Architecture

SyncKit queues all operations and syncs them when online. The queue is persisted to IndexedDB, so operations survive page reloads and browser restarts.

### Conflict Resolution

When the server rejects an operation due to a conflict (HTTP 409), SyncKit can resolve it automatically using one of these strategies:

- **last-write-wins**: Compare timestamps, newer wins
- **server-wins**: Always accept server data
- **client-wins**: Always keep client data
- **manual**: Wait for user decision
- **custom**: Use your own resolution logic

### Optimistic Updates

Apply changes immediately for instant UI feedback, then rollback if sync fails:

```typescript
const { operationId, rollback } = sync.push({
  resource: 'posts/123',
  method: 'PUT',
  payload: updatedPost,
  optimistic: true,
  onError: () => rollback()
})
```

### Priority Queue

Operations with higher priority are synced first:

```typescript
sync.push({
  resource: 'critical-data',
  method: 'POST',
  payload: data,
  priority: 'critical' // critical > high > normal > low
})
```

### Automatic Retry

Failed operations are retried automatically with configurable backoff:

```typescript
createSyncKit({
  retry: {
    maxAttempts: 5,
    backoff: 'exponential', // or 'linear', 'fibonacci', or custom function
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true
  }
})
```

## Plugins

SyncKit uses a micro-kernel architecture where all features are plugins.

### Core Plugins (Always Loaded)

- **queue-manager**: Priority queue management
- **network-monitor**: Online/offline detection
- **storage-indexeddb**: IndexedDB persistence
- **retry-engine**: Automatic retry with backoff
- **conflict-resolver**: Conflict detection and resolution

### Optional Plugins

```typescript
import {
  localStorageAdapter,
  batching,
  compression,
  encryption,
  backgroundSync,
  syncUI,
  analytics
} from '@oxog/synckit/plugins'

const sync = createSyncKit({
  storage: localStorageAdapter({ key: 'my-queue' }),
  plugins: [
    batching({ maxBatchSize: 10 }),
    compression({ threshold: 1024 }),
    encryption({ key: 'secret' }),
    backgroundSync({ tag: 'sync' }),
    syncUI({ position: 'bottom-right' }),
    analytics({ onReport: sendToAnalytics })
  ]
})
```

## API Reference

See the [full API documentation](https://synckit.oxog.dev/docs/api).

### Core Methods

- `init()` - Initialize and load queue from storage
- `destroy()` - Cleanup resources
- `push(operation)` - Add operation to queue
- `remove(operationId)` - Remove operation
- `clear()` - Clear entire queue
- `sync()` - Force sync immediately
- `retry(operationId)` - Retry specific operation
- `retryAll()` - Retry all failed operations
- `pause()` - Pause queue processing
- `resume()` - Resume queue processing
- `getQueue()` - Get all operations
- `getStatus()` - Get queue statistics
- `on(event, handler)` - Subscribe to events
- `off(event, handler)` - Unsubscribe from events

### Events

- `online` / `offline` - Network status change
- `push` - Operation added
- `sync-start` / `sync-success` / `sync-error` - Sync lifecycle
- `conflict` - Conflict detected
- `retry` - Retry scheduled
- `queue-change` - Queue modified
- `status-change` - Status updated

## Examples

See the [examples directory](./examples) for complete working examples:

- [Vanilla JS](./examples/vanilla)
- [React Todo App](./examples/react/todo-app)
- [Vue Form App](./examples/vue/form-app)
- [Svelte Blog App](./examples/svelte/blog-app)

## Documentation

Full documentation available at [https://synckit.oxog.dev](https://synckit.oxog.dev)

- [Getting Started](https://synckit.oxog.dev/docs/getting-started)
- [Concepts](https://synckit.oxog.dev/docs/concepts)
- [API Reference](https://synckit.oxog.dev/docs/api)
- [Plugins Guide](https://synckit.oxog.dev/docs/plugins)
- [Framework Integrations](https://synckit.oxog.dev/docs/frameworks)
- [Interactive Playground](https://synckit.oxog.dev/docs/playground)

## Browser Support

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 87

Requires:
- IndexedDB (or localStorage fallback)
- Promises
- ES6+ features

## Contributing

This is a zero-dependency project. All features must be implemented from scratch without adding runtime dependencies.

## License

MIT © Ersin KOÇ

## Links

- [GitHub Repository](https://github.com/ersinkoc/synckit)
- [NPM Package](https://www.npmjs.com/package/@oxog/synckit)
- [Documentation](https://synckit.oxog.dev)
- [Issue Tracker](https://github.com/ersinkoc/synckit/issues)
