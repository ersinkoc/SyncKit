# @oxog/synckit - LLM Documentation

> Zero-dependency offline-first data sync toolkit with micro-kernel plugin architecture

**Version:** 1.0.0
**License:** MIT
**Author:** Ersin KOÇ
**Repository:** https://github.com/ersinkoc/synckit

---

## Quick Reference

### Installation

```bash
npm install @oxog/synckit
# or
yarn add @oxog/synckit
# or
pnpm add @oxog/synckit
```

### Quick Start

```typescript
import { createSyncKit } from '@oxog/synckit'

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
  retry: { maxAttempts: 5, backoff: 'exponential' }
})

await sync.init()

const { operationId, rollback } = sync.push({
  resource: 'posts',
  method: 'POST',
  payload: { title: 'Hello', body: 'World' },
  priority: 'high',
  optimistic: true
})
```

---

## Package Overview

### Purpose

SyncKit is a comprehensive offline-first synchronization solution for web applications. It queues operations when offline, automatically syncs when back online, handles conflicts with multiple resolution strategies, supports optimistic updates, and persists the queue to IndexedDB—all without any runtime dependencies.

### Key Features

- **Offline-First**: Queue operations when offline, auto-sync when back online
- **Conflict Resolution**: 5 strategies (last-write-wins, server-wins, client-wins, manual, custom)
- **Optimistic Updates**: Apply changes immediately with rollback capability
- **Priority Queue**: Critical > high > normal > low operation ordering
- **Automatic Retry**: Configurable backoff strategies (exponential, linear, fibonacci)
- **Persistent Storage**: IndexedDB for reliable queue persistence
- **Plugin Architecture**: Micro-kernel design with powerful plugin system
- **Framework Adapters**: First-class React, Vue, and Svelte support
- **Zero Dependencies**: Everything implemented from scratch
- **Type-Safe**: Full TypeScript support with strict mode
- **Tree-Shakeable**: Only bundle what you use

### Architecture

SyncKit uses a micro-kernel architecture where the core kernel provides minimal functionality (event bus, plugin registry, basic queue operations), and all features are implemented as plugins. This makes the library highly modular and tree-shakeable.

**Data Flow:**
1. User calls `push()` to add operation to queue
2. Operation is validated through plugin hooks (`beforePush`)
3. Operation stored in persistent storage (IndexedDB)
4. If online, operation is synced via user-provided `executor`
5. On success: operation removed from queue
6. On failure: retry engine schedules retry with backoff
7. Events emitted at each step for UI updates

### Dependencies

- **Runtime:** Zero runtime dependencies
- **Peer (all optional):**
  - `react >= 17.0.0` - For React adapter
  - `vue >= 3.0.0` - For Vue adapter
  - `svelte >= 3.0.0` - For Svelte adapter

---

## API Reference

### Exports Summary

| Export | Type | Description |
|--------|------|-------------|
| `createSyncKit` | function | Factory function to create SyncKit instance |
| `SyncKitKernel` | class | Core kernel class (advanced usage) |
| `queueManager` | function | Queue manager plugin factory |
| `networkMonitor` | function | Network monitor plugin factory |
| `indexedDBStorage` | function | IndexedDB storage plugin factory |
| `retryEngine` | function | Retry engine plugin factory |
| `conflictResolver` | function | Conflict resolver plugin factory |

### Entry Points

```typescript
// Main entry - core functionality
import { createSyncKit } from '@oxog/synckit'

// Plugins entry - optional plugins
import {
  localStorageAdapter,
  batchingPlugin,
  compressionPlugin,
  encryptionPlugin,
  backgroundSyncPlugin,
  analyticsPlugin
} from '@oxog/synckit/plugins'

// React adapter
import {
  SyncKitProvider,
  useSync,
  useSyncStatus,
  useSyncQueue,
  useOnline
} from '@oxog/synckit/react'

// Vue adapter
import {
  createSyncKit as createVueSyncKit,
  useSync,
  useSyncStatus,
  useSyncQueue,
  useOnline
} from '@oxog/synckit/vue'

// Svelte adapter
import {
  createSyncStore,
  createStatusStore,
  createQueueStore,
  createOnlineStore
} from '@oxog/synckit/svelte'

// Service Worker utilities
import {
  handleSyncEvent,
  registerServiceWorker
} from '@oxog/synckit/sw'
```

---

### Main Factory Function

#### `createSyncKit<TPayload, TResult>(config)`

Creates a new SyncKit instance with automatic core plugin registration.

**Type Parameters:**

| Parameter | Description |
|-----------|-------------|
| `TPayload` | Type of operation payload data |
| `TResult` | Type of sync result data |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `config` | `SyncKitConfig` | Yes | - | Configuration options |

**Config Options:**

```typescript
interface SyncKitConfig<TPayload = unknown, TResult = unknown> {
  /** Unique identifier for this instance (used for storage key) */
  name: string

  /** Storage adapter: 'indexeddb' | 'localstorage' | custom StorageAdapter */
  storage: 'indexeddb' | 'localstorage' | StorageAdapter

  /** Function to execute sync operations */
  executor: (operation: Operation<TPayload>) => Promise<TResult>

  /** Conflict resolution strategy */
  conflictStrategy?: 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual' | 'custom'

  /** Custom conflict handler (required if strategy is 'custom') */
  onConflict?: (conflict: ConflictData<TPayload, TResult>) => Promise<ConflictResolution<TPayload>>

  /** Retry configuration */
  retry?: {
    maxAttempts?: number      // Default: 5
    backoff?: 'linear' | 'exponential' | 'fibonacci' | BackoffFunction
    baseDelay?: number        // Default: 1000ms
    maxDelay?: number         // Default: 30000ms
    jitter?: boolean          // Default: false
    jitterFactor?: number     // Default: 0.1
    retryOn?: (error: Error) => boolean
  }

  /** Additional plugins to register */
  plugins?: Plugin[]

  /** Auto-sync when online (default: true) */
  autoSync?: boolean

  /** Polling interval for sync when online (default: 0 = disabled) */
  syncInterval?: number
}
```

**Returns:** `SyncKit<TPayload, TResult>` - The SyncKit instance

**Example:**

```typescript
// Basic usage
const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => {
    const res = await fetch(`/api/${op.resource}`, {
      method: op.method,
      body: JSON.stringify(op.payload)
    })
    return res.json()
  }
})

// With full configuration
const sync = createSyncKit<UserPayload, ApiResponse>({
  name: 'user-sync',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await api.request(operation)
    return response.data
  },
  conflictStrategy: 'custom',
  onConflict: async (conflict) => {
    // Custom merge logic
    return { merged: { ...conflict.serverData, ...conflict.localData } }
  },
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    jitterFactor: 0.1,
    retryOn: (error) => {
      // Don't retry on 4xx errors
      return !error.message.includes('400')
    }
  },
  autoSync: true,
  syncInterval: 60000 // Check every minute
})
```

---

### SyncKit Instance Methods

#### Lifecycle Methods

##### `.init(): Promise<void>`

Initialize the kernel. Loads queue from storage and starts network monitoring. **Must be called before using other methods.**

```typescript
const sync = createSyncKit(config)
await sync.init()
// Now ready to use
```

**Error Handling:**
- Throws `Error('Kernel already initialized')` if called twice

##### `.destroy(): Promise<void>`

Cleanup resources, close storage connection, and unregister plugins.

```typescript
await sync.destroy()
```

---

#### Queue Operations

##### `.push(operation): PushResult`

Add an operation to the sync queue.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | `OperationInput<TPayload>` | Yes | - | Operation to queue |

**OperationInput Interface:**

```typescript
interface OperationInput<TPayload = unknown> {
  /** Optional custom ID (auto-generated if not provided) */
  id?: string
  /** Resource path (e.g., 'posts', 'users/123') */
  resource: string
  /** HTTP method or action */
  method: string
  /** Operation payload */
  payload: TPayload
  /** Priority level: 'critical' | 'high' | 'normal' | 'low' (default: 'normal') */
  priority?: Priority
  /** Enable optimistic updates */
  optimistic?: boolean
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Success callback */
  onSuccess?: (result: unknown) => void
  /** Error callback */
  onError?: (error: Error) => void
}
```

**Returns:**

```typescript
interface PushResult {
  /** Generated operation ID */
  operationId: string
  /** Optimistic update ID (if optimistic enabled) */
  optimisticId: string | null
  /** Function to rollback optimistic update */
  rollback: () => void
}
```

**Example:**

```typescript
// Basic push
const { operationId } = sync.push({
  resource: 'posts',
  method: 'POST',
  payload: { title: 'Hello', body: 'World' }
})

// With optimistic update and rollback
const { operationId, rollback } = sync.push({
  resource: 'posts/123',
  method: 'PUT',
  payload: updatedPost,
  priority: 'high',
  optimistic: true,
  onSuccess: (result) => {
    console.log('Synced successfully:', result)
  },
  onError: (error) => {
    console.error('Sync failed:', error)
    rollback() // Revert the optimistic update
  }
})

// With metadata
sync.push({
  resource: 'users/123',
  method: 'PATCH',
  payload: { email: 'new@example.com' },
  metadata: {
    version: 2,
    etag: 'abc123',
    userId: 'user-456'
  }
})
```

##### `.remove(operationId): boolean`

Remove an operation from the queue.

```typescript
const removed = sync.remove('op_abc123')
// Returns true if found and removed, false otherwise
```

##### `.clear(): void`

Clear all operations from the queue.

```typescript
sync.clear()
```

##### `.getQueue(): Operation<TPayload>[]`

Get all operations in the queue.

```typescript
const operations = sync.getQueue()
operations.forEach(op => {
  console.log(`${op.id}: ${op.method} ${op.resource} - ${op.status}`)
})
```

##### `.getOperation(id): Operation<TPayload> | undefined`

Get a specific operation by ID.

```typescript
const op = sync.getOperation('op_abc123')
if (op) {
  console.log(`Status: ${op.status}, Attempts: ${op.attempts}`)
}
```

---

#### Queue Status

##### `.getStatus(): QueueStatus`

Get queue status and statistics.

**Returns:**

```typescript
interface QueueStatus {
  /** Number of pending operations */
  pending: number
  /** Number of currently syncing operations */
  syncing: number
  /** Number of failed operations */
  failed: number
  /** Total operations in queue */
  total: number
  /** Whether queue is currently processing */
  isProcessing: boolean
  /** Whether queue is paused */
  isPaused: boolean
  /** Whether device is online */
  isOnline: boolean
}
```

**Example:**

```typescript
const status = sync.getStatus()
console.log(`Queue: ${status.pending} pending, ${status.syncing} syncing, ${status.failed} failed`)

if (!status.isOnline) {
  showOfflineIndicator()
}
```

##### `.isPending(operationId): boolean`

Check if an operation is pending.

```typescript
if (sync.isPending('op_abc123')) {
  console.log('Operation is waiting to sync')
}
```

---

#### Sync Control

##### `.sync(): Promise<SyncResult<TResult>[]>`

Force sync all pending operations immediately.

```typescript
const results = await sync.sync()
results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.operationId} synced in ${result.duration}ms`)
  } else {
    console.log(`✗ ${result.operationId} failed: ${result.error?.message}`)
  }
})
```

**Returns:** Array of `SyncResult`:

```typescript
interface SyncResult<TResult = unknown> {
  operationId: string
  success: boolean
  result: TResult | null
  error: Error | null
  duration: number
  attempts: number
  conflict: boolean
  conflictResolution: ConflictResolution | null
}
```

##### `.pause(): void`

Pause queue processing. Operations will still be queued but not synced.

```typescript
sync.pause()
// Queue operations but don't sync
sync.push({ resource: 'posts', method: 'POST', payload: data })
```

##### `.resume(): void`

Resume queue processing and trigger sync if online.

```typescript
sync.resume()
// Will automatically sync queued operations if online
```

##### `.isPaused(): boolean`

Check if queue is paused.

```typescript
if (sync.isPaused()) {
  showPausedIndicator()
}
```

##### `.retry(operationId): Promise<SyncResult<TResult>>`

Retry a specific failed operation.

```typescript
try {
  const result = await sync.retry('op_abc123')
  if (result.success) {
    console.log('Retry successful!')
  }
} catch (error) {
  console.error('Operation not found')
}
```

##### `.retryAll(): Promise<SyncResult<TResult>[]>`

Retry all failed operations.

```typescript
const results = await sync.retryAll()
const successCount = results.filter(r => r.success).length
console.log(`${successCount}/${results.length} operations recovered`)
```

---

#### Network Status

##### `.isOnline(): boolean`

Check if device is online.

```typescript
if (sync.isOnline()) {
  console.log('Device is connected')
}
```

##### `.setOnline(online): void`

Manually set online status. Useful for testing.

```typescript
// Simulate offline
sync.setOnline(false)

// Operations will be queued
sync.push({ ... })

// Simulate coming back online - will trigger sync
sync.setOnline(true)
```

---

#### Batch Operations

##### `.batch(batchId, operations): string`

Create a batch of operations.

```typescript
const batchId = sync.batch('user-updates', [
  { resource: 'users/1', method: 'PUT', payload: user1 },
  { resource: 'users/2', method: 'PUT', payload: user2 },
  { resource: 'users/3', method: 'PUT', payload: user3 }
])

// Listen for batch completion
sync.on('batch-complete', (event) => {
  if (event.batchId === batchId) {
    console.log(`Batch complete: ${event.allSuccessful ? 'success' : 'partial failure'}`)
  }
})
```

---

#### Plugin Management

##### `.register(plugin): void`

Register a plugin.

```typescript
import { compressionPlugin, encryptionPlugin } from '@oxog/synckit/plugins'

sync.register(compressionPlugin({ threshold: 1024 }))
sync.register(encryptionPlugin({ key: 'my-secret-key', salt: 'app-salt' }))
```

##### `.unregister(pluginName): void`

Unregister a plugin.

```typescript
sync.unregister('compression')
```

##### `.getPlugin<P>(name): P | undefined`

Get a registered plugin by name.

```typescript
const retryPlugin = sync.getPlugin<RetryEnginePlugin>('retry-engine')
if (retryPlugin) {
  const nextRetry = retryPlugin.api.getRetryTime('op_123')
}
```

##### `.listPlugins(): PluginInfo[]`

List all registered plugins.

```typescript
const plugins = sync.listPlugins()
plugins.forEach(p => {
  console.log(`${p.name} v${p.version} (${p.type}) - ${p.enabled ? 'enabled' : 'disabled'}`)
})
```

---

#### Event System

##### `.on<E>(eventType, handler): Unsubscribe`

Subscribe to an event. Returns an unsubscribe function.

```typescript
// Network events
const unsub1 = sync.on('online', () => {
  console.log('Back online!')
})

const unsub2 = sync.on('offline', () => {
  console.log('Gone offline, operations will be queued')
})

// Sync lifecycle events
sync.on('sync-start', (event) => {
  console.log(`Syncing: ${event.operation.resource}`)
})

sync.on('sync-success', (event) => {
  console.log(`Synced in ${event.duration}ms:`, event.result)
})

sync.on('sync-error', (event) => {
  console.log(`Error (attempt ${event.attempt}):`, event.error.message)
  if (event.willRetry) {
    console.log('Will retry...')
  }
})

// Queue events
sync.on('push', (event) => {
  console.log(`Queued: ${event.operation.id}`)
})

sync.on('queue-change', (event) => {
  console.log(`Queue size: ${event.queue.length}`)
})

// Cleanup
unsub1()
unsub2()
```

##### `.onAny(handler): Unsubscribe`

Subscribe to all events.

```typescript
const unsub = sync.onAny((event) => {
  console.log(`[${event.type}]`, event)
})
```

##### `.off<E>(eventType, handler): void`

Unsubscribe from an event.

```typescript
const handler = (event) => console.log(event)
sync.on('push', handler)
// Later...
sync.off('push', handler)
```

##### `.emit(event): void`

Emit an event. Used by plugins.

```typescript
// For plugin authors
sync.emit({
  type: 'custom-event' as any,
  timestamp: Date.now(),
  data: { ... }
})
```

---

#### Configuration

##### `.configure(options): void`

Update configuration at runtime.

```typescript
sync.configure({
  autoSync: false,
  syncInterval: 120000
})
```

##### `.getOptions(): KernelOptions`

Get current configuration.

```typescript
const options = sync.getOptions()
console.log(`Max retry attempts: ${options.retry?.maxAttempts}`)
```

---

### Types & Interfaces

#### `Operation<TPayload>`

Core operation data structure.

```typescript
interface Operation<TPayload = unknown> {
  /** Unique operation identifier */
  id: string
  /** Resource path (e.g., 'posts', 'users/123') */
  resource: string
  /** HTTP method or custom action */
  method: string
  /** Operation payload data */
  payload: TPayload
  /** Priority level */
  priority: 'critical' | 'high' | 'normal' | 'low'
  /** Current status */
  status: 'pending' | 'syncing' | 'success' | 'failed' | 'conflict' | 'cancelled'
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
  /** Number of retry attempts */
  attempts: number
  /** Last attempt timestamp */
  lastAttempt: number | null
  /** Last error message */
  lastError: string | null
  /** Batch identifier (if part of batch) */
  batchId: string | null
  /** Custom metadata */
  metadata: Record<string, unknown>
}
```

#### `Priority`

```typescript
type Priority = 'critical' | 'high' | 'normal' | 'low'
```

Operations with higher priority are processed first. Within the same priority level, operations are processed in FIFO order.

#### `OperationStatus`

```typescript
type OperationStatus =
  | 'pending'    // Waiting to be synced
  | 'syncing'    // Currently being synced
  | 'success'    // Successfully synced
  | 'failed'     // Failed after max retries
  | 'conflict'   // Conflict detected
  | 'cancelled'  // Manually cancelled
```

#### `ConflictStrategy`

```typescript
type ConflictStrategy =
  | 'last-write-wins'  // Compare timestamps, newer wins
  | 'server-wins'      // Always use server data
  | 'client-wins'      // Always use client data
  | 'manual'           // Wait for user decision
  | 'custom'           // Use custom handler
```

#### `ConflictData<TPayload, TResult>`

```typescript
interface ConflictData<TPayload = unknown, TResult = unknown> {
  operation: Operation<TPayload>
  serverData: TResult
  localData: TPayload
  serverTimestamp: number
  localTimestamp: number
}
```

#### `ConflictResolution<TPayload>`

```typescript
type ConflictResolution<TPayload = unknown> =
  | 'server'               // Use server data
  | 'client'               // Use client data
  | { merged: TPayload }   // Use merged data
```

#### `BackoffStrategy`

```typescript
type BackoffStrategy = 'linear' | 'exponential' | 'fibonacci'
```

- **exponential**: `delay = baseDelay * 2^(attempt - 1)` → 1s, 2s, 4s, 8s, 16s...
- **linear**: `delay = baseDelay * attempt` → 1s, 2s, 3s, 4s, 5s...
- **fibonacci**: `delay = fib(attempt) * baseDelay` → 1s, 1s, 2s, 3s, 5s, 8s...

#### `BackoffFunction`

Custom backoff function type:

```typescript
type BackoffFunction = (attempt: number, baseDelay: number) => number

// Example: quadratic backoff
const quadraticBackoff: BackoffFunction = (attempt, baseDelay) => {
  return baseDelay * attempt * attempt
}
```

#### `StorageAdapter`

Interface for custom storage implementations:

```typescript
interface StorageAdapter {
  init(): Promise<void>
  get(key: string): Promise<Operation | undefined>
  getAll(): Promise<Operation[]>
  set(key: string, value: Operation): Promise<void>
  setAll(operations: Operation[]): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  count(): Promise<number>
  close(): Promise<void>
}
```

#### `EventType`

All available event types:

```typescript
type EventType =
  | 'online'          // Device came online
  | 'offline'         // Device went offline
  | 'push'            // Operation added to queue
  | 'remove'          // Operation removed from queue
  | 'clear'           // Queue cleared
  | 'sync-start'      // Sync started
  | 'sync-success'    // Sync succeeded
  | 'sync-error'      // Sync failed
  | 'conflict'        // Conflict detected
  | 'retry'           // Retry scheduled
  | 'queue-change'    // Queue modified
  | 'status-change'   // Status updated
  | 'batch-start'     // Batch started
  | 'batch-complete'  // Batch completed
  | 'pause'           // Queue paused
  | 'resume'          // Queue resumed
```

#### `Plugin`

Plugin interface:

```typescript
interface Plugin {
  /** Unique plugin name */
  name: string
  /** Plugin version */
  version: string
  /** Plugin type */
  type: 'core' | 'optional'
  /** Install plugin (called when registered) */
  install(kernel: SyncKit): void | Promise<void>
  /** Uninstall plugin (called when unregistered) */
  uninstall(): void | Promise<void>
  /** Plugin hooks */
  hooks?: PluginHooks
  /** Plugin-specific API exposed to users */
  api?: any
}

interface PluginHooks {
  beforePush?: (operation: OperationInput) => OperationInput | false | Promise<OperationInput | false>
  afterPush?: (operation: Operation) => void | Promise<void>
  beforeSync?: (operation: Operation) => boolean | Promise<boolean>
  afterSync?: (operation: Operation, result: SyncResult) => void | Promise<void>
  beforeRetry?: (operation: Operation, attempt: number) => boolean | Promise<boolean>
  onConflict?: (conflict: ConflictData) => ConflictResolution | undefined | Promise<ConflictResolution | undefined>
  onOnline?: () => void | Promise<void>
  onOffline?: () => void | Promise<void>
  onQueueChange?: (queue: Operation[]) => void | Promise<void>
  onStatusChange?: (status: QueueStatus) => void | Promise<void>
}
```

---

## Framework Adapters

### React Adapter

#### `SyncKitProvider`

Provides SyncKit context to React components.

```tsx
import { SyncKitProvider } from '@oxog/synckit/react'
import { compressionPlugin, analyticsPlugin } from '@oxog/synckit/plugins'

function App() {
  return (
    <SyncKitProvider
      config={{
        name: 'my-app',
        storage: 'indexeddb',
        executor: async (op) => {
          const res = await fetch(`/api/${op.resource}`, {
            method: op.method,
            body: JSON.stringify(op.payload)
          })
          return res.json()
        },
        conflictStrategy: 'last-write-wins',
        retry: {
          maxAttempts: 5,
          backoff: 'exponential'
        }
      }}
      plugins={[compressionPlugin(), analyticsPlugin()]}
    >
      <MyApp />
    </SyncKitProvider>
  )
}
```

#### `useSync()`

Main hook for sync operations.

```tsx
import { useSync } from '@oxog/synckit/react'

function CreatePost() {
  const {
    push,        // Add operation to queue
    remove,      // Remove operation
    retry,       // Retry failed operation
    retryAll,    // Retry all failed
    pause,       // Pause queue
    resume,      // Resume queue
    clear,       // Clear queue
    sync,        // Force sync
    batch,       // Create batch
    isOnline,    // Online status
    isPaused     // Pause status
  } = useSync()

  const handleSubmit = (data) => {
    const { operationId, rollback } = push({
      resource: 'posts',
      method: 'POST',
      payload: data,
      optimistic: true,
      onError: () => rollback()
    })
  }

  return (
    <div>
      {!isOnline && <span>Offline</span>}
      <button onClick={handleSubmit}>Create</button>
    </div>
  )
}
```

#### `useSyncStatus()`

Hook for queue status.

```tsx
import { useSyncStatus } from '@oxog/synckit/react'

function StatusBar() {
  const {
    pending,       // Number pending
    syncing,       // Number syncing
    failed,        // Number failed
    total,         // Total count
    isProcessing,  // Currently processing
    isPaused,      // Queue paused
    isOnline       // Online status
  } = useSyncStatus()

  return (
    <div>
      {pending > 0 && <span>{pending} pending</span>}
      {syncing > 0 && <span>{syncing} syncing</span>}
      {failed > 0 && <span className="error">{failed} failed</span>}
    </div>
  )
}
```

#### `useSyncQueue()`

Hook for queue operations list.

```tsx
import { useSyncQueue } from '@oxog/synckit/react'

function QueueViewer() {
  const queue = useSyncQueue()

  return (
    <ul>
      {queue.map((op) => (
        <li key={op.id}>
          {op.method} {op.resource} - {op.status}
        </li>
      ))}
    </ul>
  )
}
```

#### `useOnline()`

Hook for online status.

```tsx
import { useOnline } from '@oxog/synckit/react'

function OnlineIndicator() {
  const isOnline = useOnline()

  return (
    <span className={isOnline ? 'online' : 'offline'}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </span>
  )
}
```

---

### Vue Adapter

#### Plugin Installation

```typescript
import { createApp } from 'vue'
import { createSyncKit } from '@oxog/synckit/vue'

const app = createApp(App)

const { install, kernel } = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => { /* ... */ },
  autoInit: true  // Auto-initialize (default: true)
})

app.use(install)
```

#### Composables

```vue
<script setup>
import { useSync, useSyncStatus, useSyncQueue, useOnline } from '@oxog/synckit/vue'

// Main sync operations
const {
  kernel,      // SyncKit instance
  push,
  remove,
  clear,
  retry,
  retryAll,
  pause,
  resume,
  isPaused
} = useSync()

// Queue status (reactive refs)
const { pending, syncing, failed, total, isIdle, hasErrors } = useSyncStatus()

// Queue operations (reactive)
const { operations, pendingOperations, syncingOperations, failedOperations } = useSyncQueue()

// Online status
const { isOnline, networkType, effectiveType } = useOnline()

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
    <button @click="handleSubmit">Create</button>
  </div>
</template>
```

---

### Svelte Adapter

#### Store Creation

```typescript
import { createSyncStore, createStatusStore, createQueueStore, createOnlineStore } from '@oxog/synckit/svelte'

// Create main sync store
const syncStore = createSyncStore({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => { /* ... */ }
})

// Create derived stores
const statusStore = createStatusStore(syncStore.kernel)
const queueStore = createQueueStore(syncStore.kernel)
const onlineStore = createOnlineStore(syncStore.kernel)
```

#### Using Stores

```svelte
<script>
  import { syncStore, statusStore, onlineStore } from './stores'

  function handleSubmit(data) {
    $syncStore.push({
      resource: 'posts',
      method: 'POST',
      payload: data
    })
  }
</script>

{#if !$onlineStore.isOnline}
  <span>Offline</span>
{/if}

{#if $statusStore.pending > 0}
  <span>{$statusStore.pending} pending</span>
{/if}

<button on:click={handleSubmit}>Create</button>
```

---

## Optional Plugins

### Batching Plugin

Groups operations into batches for more efficient API calls.

```typescript
import { batchingPlugin } from '@oxog/synckit/plugins'

sync.register(batchingPlugin({
  maxBatchSize: 10,           // Max operations per batch
  batchWindow: 1000,          // Time window to wait (ms)
  groupByResource: true,      // Group by resource path
  errorStrategy: 'partial',   // 'all-or-nothing' | 'partial'
  batchExecutor: async (operations) => {
    // Custom batch execution
    const response = await fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify(operations.map(op => op.payload))
    })
    return response.json()
  }
}))

// Access API
const plugin = sync.getPlugin('batching')
await plugin.api.flush()  // Manually flush pending batches
plugin.api.getPendingBatchCount()  // Get pending count
```

### Compression Plugin

Compresses operation payloads to reduce storage and bandwidth.

```typescript
import { compressionPlugin } from '@oxog/synckit/plugins'

sync.register(compressionPlugin({
  algorithm: 'gzip',         // 'gzip' | 'deflate'
  threshold: 1024,           // Min size to compress (bytes)
  compressStorage: true,     // Compress in storage
  compressNetwork: false     // Compress for network (requires server support)
}))

// Access API
const plugin = sync.getPlugin('compression')
const compressed = await plugin.api.compress(data)
const decompressed = await plugin.api.decompress(compressed)
```

### Encryption Plugin

Encrypts operation payloads using AES-GCM.

```typescript
import { encryptionPlugin } from '@oxog/synckit/plugins'

sync.register(encryptionPlugin({
  key: 'my-secret-passphrase',  // String passphrase or CryptoKey
  salt: 'unique-app-salt',      // Required for passphrase
  encryptStorage: true,         // Encrypt in storage
  encryptNetwork: false         // Encrypt for network
}))

// Access API
const plugin = sync.getPlugin('encryption')
const { iv, data } = await plugin.api.encrypt(payload)
const decrypted = await plugin.api.decrypt({ iv, data })
await plugin.api.rotateKey('new-passphrase', 'new-salt')
```

### Background Sync Plugin

Uses the Background Sync API for true offline sync.

```typescript
import { backgroundSyncPlugin } from '@oxog/synckit/plugins'

// Requires service worker registration
const swRegistration = await navigator.serviceWorker.register('/sw.js')

sync.register(backgroundSyncPlugin({
  swRegistration,
  tagPrefix: 'synckit-sync',
  periodicSync: false,        // Enable periodic sync
  periodicInterval: 3600000   // 1 hour
}))

// Access API
const plugin = sync.getPlugin('background-sync')
await plugin.api.register('custom-tag')
const tags = await plugin.api.getTags()
plugin.api.isSupported()
plugin.api.isPeriodicSyncSupported()
```

### Analytics Plugin

Collects sync metrics and performance data.

```typescript
import { analyticsPlugin } from '@oxog/synckit/plugins'

sync.register(analyticsPlugin({
  onReport: (metrics) => {
    // Send to analytics service
    analytics.track('sync_metrics', metrics)
  },
  reportInterval: 60000  // Report every minute
}))
```

### LocalStorage Adapter

Alternative storage adapter using localStorage.

```typescript
import { localStorageAdapter } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  name: 'my-app',
  storage: localStorageAdapter({
    key: 'synckit-queue',
    maxSize: 5 * 1024 * 1024  // 5MB limit
  }),
  executor: async (op) => { /* ... */ }
})
```

---

## Usage Patterns

### Pattern 1: Optimistic Updates with Rollback

**Use Case:** Provide instant UI feedback while operations sync in background.

```typescript
function updateUser(userId: string, updates: Partial<User>) {
  // 1. Update UI immediately (optimistic)
  const previousUser = users.get(userId)
  users.set(userId, { ...previousUser, ...updates })

  // 2. Queue for sync
  const { rollback } = sync.push({
    resource: `users/${userId}`,
    method: 'PATCH',
    payload: updates,
    optimistic: true,
    onError: (error) => {
      // 3. Rollback on failure
      users.set(userId, previousUser)
      showError(`Failed to update: ${error.message}`)
    },
    onSuccess: () => {
      showSuccess('User updated!')
    }
  })

  // Alternative: manual rollback
  // rollback()
}
```

### Pattern 2: Priority-Based Sync

**Use Case:** Ensure critical operations are processed first.

```typescript
// Critical: payment transactions
sync.push({
  resource: 'payments',
  method: 'POST',
  payload: paymentData,
  priority: 'critical'
})

// High: user actions
sync.push({
  resource: 'orders',
  method: 'POST',
  payload: orderData,
  priority: 'high'
})

// Normal: regular updates
sync.push({
  resource: 'analytics',
  method: 'POST',
  payload: eventData,
  priority: 'normal'
})

// Low: background sync
sync.push({
  resource: 'logs',
  method: 'POST',
  payload: logData,
  priority: 'low'
})
```

### Pattern 3: Manual Conflict Resolution

**Use Case:** Let users decide how to resolve conflicts.

```typescript
const sync = createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor,
  conflictStrategy: 'manual'
})

// Listen for conflicts
sync.on('conflict', async (event) => {
  // Show conflict resolution UI
  const resolution = await showConflictModal({
    local: event.localData,
    server: event.serverData
  })

  // Get conflict resolver plugin
  const resolver = sync.getPlugin('conflict-resolver')

  // Resolve based on user choice
  if (resolution === 'keepLocal') {
    resolver.api.resolveConflict(event.operation.id, 'client')
  } else if (resolution === 'keepServer') {
    resolver.api.resolveConflict(event.operation.id, 'server')
  } else {
    // User merged manually
    resolver.api.resolveConflict(event.operation.id, { merged: resolution.merged })
  }
})
```

### Pattern 4: Batch API Calls

**Use Case:** Reduce API calls by batching multiple operations.

```typescript
import { batchingPlugin } from '@oxog/synckit/plugins'

sync.register(batchingPlugin({
  maxBatchSize: 10,
  batchWindow: 2000,
  batchExecutor: async (operations) => {
    // Send as single batch request
    const response = await fetch('/api/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: operations.map(op => ({
          id: op.id,
          method: op.method,
          resource: op.resource,
          payload: op.payload
        }))
      })
    })

    const results = await response.json()
    return results.map(r => r.success ? r.data : new Error(r.error))
  }
}))
```

### Pattern 5: Secure Sensitive Data

**Use Case:** Encrypt sensitive payloads at rest.

```typescript
import { encryptionPlugin } from '@oxog/synckit/plugins'

sync.register(encryptionPlugin({
  key: process.env.ENCRYPTION_KEY,
  salt: 'my-app-unique-salt',
  encryptStorage: true
}))

// Sensitive data is automatically encrypted in IndexedDB
sync.push({
  resource: 'credentials',
  method: 'POST',
  payload: {
    accessToken: 'secret-token',
    refreshToken: 'refresh-token'
  }
})
```

---

## Configuration

### Default Configuration Values

```typescript
const DEFAULT_OPTIONS = {
  conflictStrategy: 'last-write-wins',
  autoSync: true,
  syncInterval: 0,  // Disabled
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    baseDelay: 1000,      // 1 second
    maxDelay: 30000,      // 30 seconds
    jitter: false,
    jitterFactor: 0.1
  }
}
```

### Full Configuration Example

```typescript
const sync = createSyncKit<MyPayload, MyResult>({
  // Required
  name: 'production-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(`${API_BASE}/${operation.resource}`, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        'X-Request-ID': operation.id
      },
      body: operation.payload ? JSON.stringify(operation.payload) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  },

  // Conflict handling
  conflictStrategy: 'custom',
  onConflict: async (conflict) => {
    // Three-way merge for complex objects
    const merged = threeWayMerge(
      conflict.operation.metadata.original,
      conflict.localData,
      conflict.serverData
    )
    return { merged }
  },

  // Retry configuration
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    jitterFactor: 0.2,
    retryOn: (error) => {
      // Don't retry on auth errors
      if (error.message.includes('401')) return false
      // Don't retry on validation errors
      if (error.message.includes('422')) return false
      // Retry everything else
      return true
    }
  },

  // Behavior
  autoSync: true,
  syncInterval: 60000,  // Check every minute

  // Additional plugins
  plugins: [
    compressionPlugin({ threshold: 2048 }),
    analyticsPlugin({ onReport: sendMetrics })
  ]
})
```

---

## Error Reference

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `Kernel not initialized` | Called method before `init()` | Call `await sync.init()` first |
| `Kernel already initialized` | Called `init()` twice | Check initialization logic |
| `Operation rejected by plugin` | Plugin's `beforePush` hook returned `false` | Check plugin configuration |
| `Queue manager plugin not registered` | Core plugin missing | Use `createSyncKit()` factory |
| `Network monitor plugin not registered` | Core plugin missing | Use `createSyncKit()` factory |
| `IndexedDB not available` | Private browsing or unsupported | Use localStorage fallback |
| `Salt is required` | Encryption without salt | Provide `salt` option |
| `Custom resolver not provided` | `conflictStrategy: 'custom'` without handler | Provide `onConflict` function |

### Error Handling Pattern

```typescript
sync.on('sync-error', (event) => {
  const { operation, error, willRetry, attempt } = event

  // Log error
  console.error(`Sync failed for ${operation.resource}:`, error.message)

  if (willRetry) {
    console.log(`Will retry (attempt ${attempt + 1}/${maxAttempts})`)
  } else {
    // Max retries reached - handle permanently failed operation
    showError(`Failed to sync ${operation.resource} after ${attempt} attempts`)

    // Option 1: Remove from queue
    sync.remove(operation.id)

    // Option 2: Keep for manual retry
    // User can call sync.retry(operation.id) later
  }
})
```

---

## Browser Support

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 87

**Required APIs:**
- IndexedDB (or localStorage fallback)
- Promises / async-await
- ES6+ features

**Optional APIs (for plugins):**
- CompressionStream (compression plugin)
- Web Crypto API (encryption plugin)
- Background Sync API (background-sync plugin)
- Network Information API (enhanced network detection)

---

## Performance Considerations

### Bundle Size

- **Core package:** ~8KB minified + gzip
- **With all plugins:** ~15KB minified + gzip
- **Tree-shakeable:** Yes - only import what you use

### Optimization Tips

1. **Use priority wisely:** Reserve `critical` for truly critical operations
2. **Batch similar operations:** Use the batching plugin for bulk updates
3. **Compress large payloads:** Enable compression for payloads > 1KB
4. **Limit queue size:** Periodically clear old failed operations
5. **Use sync intervals:** Instead of immediate sync, batch with intervals

```typescript
// Good: Batch with interval
const sync = createSyncKit({
  ...config,
  syncInterval: 5000,  // Check every 5 seconds
  autoSync: true
})

// Good: Clear old failed operations
setInterval(() => {
  const queue = sync.getQueue()
  const oldFailed = queue.filter(op =>
    op.status === 'failed' &&
    Date.now() - op.updatedAt > 24 * 60 * 60 * 1000  // 24 hours
  )
  oldFailed.forEach(op => sync.remove(op.id))
}, 60 * 60 * 1000)  // Every hour
```

---

## Comparison with Alternatives

| Feature | SyncKit | Workbox | PouchDB | TanStack Query |
|---------|---------|---------|---------|----------------|
| Offline-first | ✅ | ✅ | ✅ | Partial |
| Zero dependencies | ✅ | ❌ | ❌ | ❌ |
| Conflict resolution | 5 strategies | Manual | MVCC | Manual |
| Priority queue | ✅ | ❌ | ❌ | ❌ |
| Framework adapters | React, Vue, Svelte | ❌ | ❌ | React |
| IndexedDB persistence | ✅ | ✅ | ✅ | ❌ |
| TypeScript | Native | Types | Types | Native |
| Service Worker | Optional | Required | Optional | ❌ |
| Bundle size | ~8KB | ~12KB | ~46KB | ~13KB |

---

## FAQ

### Q: How does SyncKit handle offline/online transitions?

**A:** SyncKit uses the Network Information API and browser online/offline events to detect connectivity. When going offline, operations are queued to IndexedDB. When coming back online, the queue is automatically processed. You can also configure ping checks for more reliable detection.

### Q: Can I use a custom storage backend?

**A:** Yes! Implement the `StorageAdapter` interface and pass it as the `storage` option:

```typescript
const customStorage: StorageAdapter = {
  async init() { /* ... */ },
  async get(key) { /* ... */ },
  async getAll() { /* ... */ },
  async set(key, value) { /* ... */ },
  async setAll(operations) { /* ... */ },
  async remove(key) { /* ... */ },
  async clear() { /* ... */ },
  async count() { /* ... */ },
  async close() { /* ... */ }
}

const sync = createSyncKit({
  storage: customStorage,
  // ...
})
```

### Q: How do I handle authentication tokens?

**A:** Get the current token in your executor:

```typescript
const sync = createSyncKit({
  executor: async (operation) => {
    const token = await getAccessToken()  // Get fresh token
    return fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  }
})
```

### Q: Can I pause sync during user interactions?

**A:** Yes, use `pause()` and `resume()`:

```typescript
// Pause during form editing
formInput.addEventListener('focus', () => sync.pause())
formInput.addEventListener('blur', () => sync.resume())
```

### Q: How do I debug sync issues?

**A:** Enable comprehensive logging:

```typescript
sync.onAny((event) => {
  console.log(`[SyncKit] ${event.type}`, event)
})

// Or log specific events
sync.on('sync-error', (event) => {
  console.error('Sync failed:', event.operation, event.error)
})
```

---

## Links

- **NPM:** https://www.npmjs.com/package/@oxog/synckit
- **GitHub:** https://github.com/ersinkoc/synckit
- **Documentation:** https://synckit.oxog.dev
- **Issues:** https://github.com/ersinkoc/synckit/issues
- **Changelog:** https://github.com/ersinkoc/synckit/blob/main/CHANGELOG.md

---

## LLM Usage Notes

### Recommended Prompts

When helping users with this package:

1. "Help me implement offline-first data sync using SyncKit"
2. "Debug this SyncKit error: {error message}"
3. "Optimize my SyncKit configuration for {use case}"
4. "Migrate from {alternative} to SyncKit"
5. "Implement conflict resolution with SyncKit"
6. "Set up SyncKit with React/Vue/Svelte"

### Common Misconceptions

1. **Misconception:** SyncKit requires a service worker
   **Reality:** Service workers are optional. The background-sync plugin uses them for enhanced functionality, but the core works without.

2. **Misconception:** Operations are synced in the order they were added
   **Reality:** Operations are synced by priority first, then by creation time within the same priority.

3. **Misconception:** Failed operations are automatically removed
   **Reality:** Failed operations stay in the queue until max retries, then remain with `failed` status until manually removed or retried.

4. **Misconception:** The `executor` function must return the operation payload
   **Reality:** The `executor` can return any result type; it's stored in `SyncResult.result`.

### Code Generation Guidelines

When generating code for this package:

- Always call `await sync.init()` before using other methods
- Import types separately with `import type` for better tree-shaking
- Use the latest API patterns (v1.0.0)
- Include error handling for async operations
- Follow the configuration patterns shown in examples
- Prefer `createSyncKit()` factory over direct `SyncKitKernel` instantiation
- Use `optimistic: true` with a rollback handler for better UX
- Always provide both `onSuccess` and `onError` callbacks for user feedback

---

## Document Metadata

- **Generated:** 2025-01-XX
- **Package Version:** 1.0.0
- **Documentation Version:** 1.0
- **Format:** LLM-Optimized Markdown
- **Token Count:** ~12,000

