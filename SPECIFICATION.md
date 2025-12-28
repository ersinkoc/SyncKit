# SyncKit - Complete Package Specification

## Package Identity

- **Package Name**: `@oxog/synckit`
- **Version**: 1.0.0
- **Description**: Zero-dependency offline-first data sync toolkit with micro-kernel plugin architecture
- **License**: MIT
- **Author**: Ersin KOÇ
- **Repository**: https://github.com/ersinkoc/synckit
- **Documentation**: https://synckit.oxog.dev
- **Keywords**: offline-first, sync, queue, indexeddb, pwa, service-worker, conflict-resolution, optimistic-updates

## Overview

SyncKit is a comprehensive offline-first synchronization solution for web applications that provides:

1. **Automatic Queue Management**: Operations are queued when offline and automatically synced when back online
2. **Conflict Resolution**: Multiple strategies (last-write-wins, server-wins, client-wins, manual, custom)
3. **Optimistic Updates**: Apply changes immediately with rollback capability
4. **Priority Queue**: Critical operations processed first
5. **Retry Engine**: Automatic retry with configurable backoff strategies
6. **Persistent Storage**: IndexedDB for reliable queue persistence
7. **Plugin Architecture**: Micro-kernel design with powerful plugin system
8. **Framework Adapters**: First-class support for React, Vue, and Svelte
9. **Zero Dependencies**: Everything implemented from scratch

## Core Principles

### 1. Offline-First
- Queue is the source of truth when offline
- Never lose user data
- Always persist before acknowledging operations
- Graceful degradation

### 2. Zero Dependencies
- No runtime dependencies whatsoever
- All functionality implemented from scratch
- Reduces bundle size and security vulnerabilities
- Full control over implementation

### 3. Type Safety
- Written in TypeScript with strict mode
- Full generic support for payloads and results
- Comprehensive type definitions
- Runtime type validation where necessary

### 4. Extensibility
- Micro-kernel architecture separates core from plugins
- Plugin hooks for all lifecycle events
- Custom storage adapters
- Custom conflict resolvers
- Framework adapters

### 5. Developer Experience
- Simple, intuitive API
- Comprehensive documentation
- Interactive playground
- Visual debugging panel
- Framework-specific hooks

## Technical Architecture

### Micro-Kernel Design

```
┌─────────────────────────────────────────────────────────┐
│                     SyncKit Kernel                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Event Bus (pub/sub for all events)              │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Plugin Registry (manage plugin lifecycle)       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Core API (push, sync, retry, pause/resume)      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌──────▼──────┐  ┌─────▼─────┐
    │   Core    │   │  Optional   │  │ Framework │
    │  Plugins  │   │   Plugins   │  │  Adapters │
    └───────────┘   └─────────────┘  └───────────┘
         │                 │                │
    ┌────┴────┐      ┌─────┴─────┐    ┌────┴────┐
    │ Queue   │      │ Batching  │    │  React  │
    │ Manager │      │           │    │         │
    ├─────────┤      ├───────────┤    ├─────────┤
    │ Network │      │Compression│    │   Vue   │
    │ Monitor │      │           │    │         │
    ├─────────┤      ├───────────┤    ├─────────┤
    │ Storage │      │Encryption │    │ Svelte  │
    │IndexedDB│      │           │    │         │
    ├─────────┤      ├───────────┤    └─────────┘
    │ Retry   │      │Background │
    │ Engine  │      │   Sync    │
    ├─────────┤      ├───────────┤
    │Conflict │      │ Sync UI   │
    │Resolver │      │           │
    └─────────┘      ├───────────┤
                     │ Analytics │
                     └───────────┘
```

### Data Flow

```
User Action
    │
    ▼
┌─────────────────┐
│ sync.push(op)   │ ─────┐
└─────────────────┘      │
                         │ Optimistic Update?
                         │ (immediate UI update)
                         │
                         ▼
┌─────────────────────────────────────┐
│ beforePush hooks (validation)       │
└─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────┐
│ Queue Manager (enqueue by priority) │
└─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────┐
│ Storage Adapter (persist to IndexedDB) │
└─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────┐
│ Emit 'push' event                   │
└─────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Is Online?      │
              └──────────────────┘
                  │           │
              Yes │           │ No
                  │           │
                  ▼           ▼
        ┌─────────────┐  ┌──────────────┐
        │ Start Sync  │  │ Wait for     │
        │             │  │ 'online' evt │
        └─────────────┘  └──────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ beforeSync hooks    │
        └─────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ Execute Operation   │
        │ (call executor fn)  │
        └─────────────────────┘
                  │
          ┌───────┴───────┐
          │               │
      Success         Error/Conflict
          │               │
          ▼               ▼
    ┌─────────┐    ┌──────────────┐
    │ Remove  │    │ Conflict?    │
    │ from    │    └──────────────┘
    │ Queue   │         │      │
    └─────────┘         │      │
          │         Yes │      │ No
          │             │      │
          ▼             ▼      ▼
    ┌─────────┐   ┌────────┐ ┌────────┐
    │ Emit    │   │Resolve │ │ Retry  │
    │'success'│   │Conflict│ │ Engine │
    └─────────┘   └────────┘ └────────┘
          │             │         │
          ▼             ▼         ▼
    ┌─────────┐   ┌────────┐ ┌────────┐
    │afterSync│   │ Retry  │ │Schedule│
    │  hooks  │   │  or    │ │ Retry  │
    └─────────┘   │ Emit   │ │(backoff)│
                  └────────┘ └────────┘
```

## Public API Specification

### Factory Function

```typescript
function createSyncKit<TPayload = unknown, TResult = unknown>(
  config: SyncKitConfig<TPayload, TResult>
): SyncKit<TPayload, TResult>
```

**Parameters:**
- `config`: Configuration object

**Returns:**
- SyncKit instance

**Example:**
```typescript
const sync = createSyncKit({
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
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000
  }
})
```

### SyncKit Interface

#### Queue Operations

##### `push(operation: OperationInput<TPayload>): PushResult`

Add operation to queue.

**Parameters:**
- `operation.resource`: Resource identifier (e.g., 'posts', 'users/123')
- `operation.method`: HTTP method or custom action
- `operation.payload`: Operation data
- `operation.priority?`: 'critical' | 'high' | 'normal' | 'low' (default: 'normal')
- `operation.optimistic?`: Enable optimistic updates (default: false)
- `operation.metadata?`: Custom metadata
- `operation.onSuccess?`: Success callback
- `operation.onError?`: Error callback

**Returns:**
- `operationId`: Unique operation identifier
- `optimisticId`: Temporary ID for optimistic updates
- `rollback`: Function to rollback optimistic update

**Example:**
```typescript
const { operationId, rollback } = sync.push({
  resource: 'posts',
  method: 'POST',
  payload: { title: 'Hello', body: 'World' },
  priority: 'high',
  optimistic: true,
  onSuccess: (result) => console.log('Posted!', result),
  onError: (error) => {
    console.error('Failed:', error)
    rollback() // Revert UI changes
  }
})
```

##### `remove(operationId: string): boolean`

Remove operation from queue.

**Returns:** true if removed, false if not found

##### `clear(): void`

Clear entire queue.

##### `getQueue(): Operation<TPayload>[]`

Get all queued operations.

##### `getOperation(id: string): Operation<TPayload> | undefined`

Get specific operation by ID.

##### `getStatus(): QueueStatus`

Get queue statistics.

**Returns:**
```typescript
{
  pending: number      // Waiting to sync
  syncing: number      // Currently syncing
  failed: number       // Failed operations
  total: number        // Total in queue
  isProcessing: boolean
  isPaused: boolean
  isOnline: boolean
}
```

##### `isPending(operationId: string): boolean`

Check if operation is pending.

#### Sync Control

##### `sync(): Promise<SyncResult<TResult>[]>`

Force sync all pending operations immediately.

**Returns:** Array of sync results

##### `pause(): void`

Pause queue processing.

##### `resume(): void`

Resume queue processing.

##### `isPaused(): boolean`

Check if queue is paused.

##### `retry(operationId: string): Promise<SyncResult<TResult>>`

Retry specific failed operation.

##### `retryAll(): Promise<SyncResult<TResult>[]>`

Retry all failed operations.

#### Network Status

##### `isOnline(): boolean`

Get online status.

##### `setOnline(online: boolean): void`

Manually override online status (for testing).

#### Batch Operations

##### `batch(batchId: string, operations: OperationInput<TPayload>[]): string`

Group operations into a batch.

**Returns:** Batch ID

**Example:**
```typescript
sync.batch('user-profile-update', [
  { resource: 'profile', method: 'PUT', payload: { name: 'John' } },
  { resource: 'settings', method: 'PUT', payload: { theme: 'dark' } },
  { resource: 'avatar', method: 'POST', payload: avatarFile }
])
```

#### Plugin Management

##### `register(plugin: Plugin): void`

Register a plugin.

##### `unregister(pluginName: string): void`

Unregister a plugin.

##### `getPlugin<P extends Plugin>(name: string): P | undefined`

Get plugin instance by name.

##### `listPlugins(): PluginInfo[]`

List all registered plugins.

#### Event System

##### `on<E extends EventType>(eventType: E, handler: EventHandler<E>): Unsubscribe`

Subscribe to events.

**Event Types:**
- `online` - Network back online
- `offline` - Network went offline
- `push` - Operation added to queue
- `remove` - Operation removed
- `clear` - Queue cleared
- `sync-start` - Sync started for operation
- `sync-success` - Sync completed successfully
- `sync-error` - Sync failed
- `conflict` - Conflict detected
- `retry` - Retry scheduled
- `queue-change` - Queue modified
- `status-change` - Status changed
- `batch-start` - Batch sync started
- `batch-complete` - Batch sync completed
- `pause` - Queue paused
- `resume` - Queue resumed

**Example:**
```typescript
const unsubscribe = sync.on('sync-error', (event) => {
  console.error(`Operation ${event.operation.id} failed:`, event.error)
  console.log(`Will retry: ${event.willRetry}`)
  console.log(`Attempt: ${event.attempt}`)
})

// Later: unsubscribe()
```

##### `off<E extends EventType>(eventType: E, handler: EventHandler<E>): void`

Unsubscribe from events.

##### `emit(event: KernelEvent): void`

Emit custom event (for plugins).

#### Lifecycle

##### `init(): Promise<void>`

Initialize kernel and load persisted queue.

**Must be called before using the instance.**

##### `destroy(): Promise<void>`

Cleanup resources and close connections.

##### `configure(options: Partial<KernelOptions>): void`

Update configuration at runtime.

##### `getOptions(): KernelOptions`

Get current configuration.

## Type Definitions

### Core Types

```typescript
interface Operation<TPayload = unknown> {
  id: string                      // Unique identifier
  resource: string                // Resource path
  method: string                  // HTTP method or action
  payload: TPayload               // Operation data
  priority: Priority              // Queue priority
  status: OperationStatus         // Current status
  createdAt: number               // Timestamp
  updatedAt: number               // Last update timestamp
  attempts: number                // Retry count
  lastAttempt: number | null      // Last retry timestamp
  lastError: string | null        // Last error message
  batchId: string | null          // Batch identifier
  metadata: Record<string, unknown> // Custom data
}

interface OperationInput<TPayload = unknown> {
  id?: string                     // Optional custom ID
  resource: string
  method: string
  payload: TPayload
  priority?: Priority
  optimistic?: boolean
  metadata?: Record<string, unknown>
  onSuccess?: (result: unknown) => void
  onError?: (error: Error) => void
}

type Priority = 'critical' | 'high' | 'normal' | 'low'

type OperationStatus =
  | 'pending'    // Waiting to sync
  | 'syncing'    // Currently syncing
  | 'success'    // Completed successfully
  | 'failed'     // Failed after retries
  | 'conflict'   // Conflict detected
  | 'cancelled'  // Manually cancelled

interface PushResult {
  operationId: string
  optimisticId: string | null
  rollback: () => void
}

interface QueueStatus {
  pending: number
  syncing: number
  failed: number
  total: number
  isProcessing: boolean
  isPaused: boolean
  isOnline: boolean
}

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

### Configuration Types

```typescript
interface SyncKitConfig<TPayload = unknown, TResult = unknown> {
  // Required
  name: string                    // Unique identifier for storage
  storage: 'indexeddb' | 'localstorage' | StorageAdapter
  executor: Executor<TPayload, TResult>

  // Optional
  conflictStrategy?: ConflictStrategy  // Default: 'last-write-wins'
  onConflict?: ConflictHandler<TPayload, TResult>
  retry?: Partial<RetryOptions>
  plugins?: Plugin[]
  autoSync?: boolean              // Default: true
  syncInterval?: number           // Default: 0 (disabled)
}

type Executor<TPayload, TResult> = (
  operation: Operation<TPayload>
) => Promise<TResult>

interface RetryOptions {
  maxAttempts: number             // Default: 5
  backoff: 'linear' | 'exponential' | 'fibonacci' | BackoffFunction
  baseDelay: number               // Default: 1000ms
  maxDelay: number                // Default: 30000ms
  jitter?: boolean                // Default: false
  jitterFactor?: number           // Default: 0.1 (10%)
}

type BackoffFunction = (attempt: number, baseDelay: number) => number
```

### Conflict Types

```typescript
type ConflictStrategy =
  | 'last-write-wins'  // Compare timestamps
  | 'server-wins'      // Always use server data
  | 'client-wins'      // Always use client data
  | 'manual'           // Wait for user decision
  | 'custom'           // Use custom handler

interface ConflictData<TPayload = unknown, TResult = unknown> {
  operation: Operation<TPayload>
  serverData: TResult
  localData: TPayload
  serverTimestamp: number
  localTimestamp: number
}

type ConflictResolution<TPayload = unknown> =
  | 'server'
  | 'client'
  | { merged: TPayload }

type ConflictHandler<TPayload, TResult> = (
  conflict: ConflictData<TPayload, TResult>
) => Promise<ConflictResolution<TPayload>>
```

### Plugin Types

```typescript
interface Plugin {
  // Identity
  name: string
  version: string
  type: 'core' | 'optional'

  // Lifecycle
  install(kernel: SyncKit): void | Promise<void>
  uninstall(): void | Promise<void>

  // Hooks
  hooks?: {
    beforePush?: (operation: OperationInput) => OperationInput | false
    afterPush?: (operation: Operation) => void
    beforeSync?: (operation: Operation) => boolean
    afterSync?: (operation: Operation, result: SyncResult) => void
    beforeRetry?: (operation: Operation, attempt: number) => boolean
    onConflict?: (conflict: ConflictData) => ConflictResolution | undefined
    onOnline?: () => void
    onOffline?: () => void
    onQueueChange?: (queue: Operation[]) => void
    onStatusChange?: (status: QueueStatus) => void
  }

  // API
  api?: Record<string, unknown>
}

interface PluginInfo {
  name: string
  version: string
  type: 'core' | 'optional'
  enabled: boolean
}
```

### Storage Types

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

### Event Types

```typescript
type EventType =
  | 'online'
  | 'offline'
  | 'push'
  | 'remove'
  | 'clear'
  | 'sync-start'
  | 'sync-success'
  | 'sync-error'
  | 'conflict'
  | 'retry'
  | 'queue-change'
  | 'status-change'
  | 'batch-start'
  | 'batch-complete'
  | 'pause'
  | 'resume'

interface OnlineEvent {
  type: 'online'
  timestamp: number
}

interface OfflineEvent {
  type: 'offline'
  timestamp: number
}

interface PushEvent {
  type: 'push'
  timestamp: number
  operation: Operation
  optimistic: boolean
}

interface SyncStartEvent {
  type: 'sync-start'
  timestamp: number
  operation: Operation
}

interface SyncSuccessEvent {
  type: 'sync-success'
  timestamp: number
  operation: Operation
  result: unknown
  duration: number
}

interface SyncErrorEvent {
  type: 'sync-error'
  timestamp: number
  operation: Operation
  error: Error
  willRetry: boolean
  attempt: number
}

interface ConflictEvent {
  type: 'conflict'
  timestamp: number
  operation: Operation
  serverData: unknown
  localData: unknown
  resolution: ConflictResolution | null
}

interface QueueChangeEvent {
  type: 'queue-change'
  timestamp: number
  queue: Operation[]
  added: Operation[]
  removed: Operation[]
  updated: Operation[]
}

interface StatusChangeEvent {
  type: 'status-change'
  timestamp: number
  status: QueueStatus
  previousStatus: QueueStatus
}

interface BatchStartEvent {
  type: 'batch-start'
  timestamp: number
  batchId: string
  operations: Operation[]
}

interface BatchCompleteEvent {
  type: 'batch-complete'
  timestamp: number
  batchId: string
  results: SyncResult[]
  allSuccessful: boolean
}

type KernelEvent =
  | OnlineEvent
  | OfflineEvent
  | PushEvent
  | SyncStartEvent
  | SyncSuccessEvent
  | SyncErrorEvent
  | ConflictEvent
  | QueueChangeEvent
  | StatusChangeEvent
  | BatchStartEvent
  | BatchCompleteEvent

type EventHandler<E extends EventType> = (
  event: Extract<KernelEvent, { type: E }>
) => void

type Unsubscribe = () => void
```

## Core Plugins (Always Loaded)

### 1. queue-manager

Priority queue implementation.

**API:**
```typescript
interface QueueManagerAPI {
  enqueue(operation: Operation): void
  dequeue(): Operation | undefined
  peek(): Operation | undefined
  remove(id: string): boolean
  update(id: string, updates: Partial<Operation>): boolean
  clear(): void
  getAll(): Operation[]
  getByStatus(status: OperationStatus): Operation[]
  getByPriority(priority: Priority): Operation[]
  getByResource(resource: string): Operation[]
  getBatch(batchId: string): Operation[]
  find(predicate: (op: Operation) => boolean): Operation[]
  count(): number
  countByStatus(): Record<OperationStatus, number>
}
```

**Priority Order:** critical > high > normal > low
**Same Priority:** FIFO

### 2. network-monitor

Network status detection.

**API:**
```typescript
interface NetworkMonitorAPI {
  isOnline(): boolean
  getConnectionType(): ConnectionType | null
  getEffectiveType(): EffectiveConnectionType | null
  onStatusChange(handler: (online: boolean) => void): Unsubscribe
}

type ConnectionType =
  | 'bluetooth' | 'cellular' | 'ethernet'
  | 'wifi' | 'wimax' | 'other' | 'none' | 'unknown'

type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g'
```

**Detection Strategy:**
1. `navigator.onLine` (primary)
2. Optional ping endpoint (accuracy)
3. Network Information API (connection type)
4. Debounce rapid changes (300ms)

### 3. storage-indexeddb

IndexedDB persistence.

**Implementation:**
- Database: 'synckit'
- Store: 'operations'
- Key: operation.id
- Indexes: status, priority, createdAt, resource
- Transactions for consistency
- Upgrade handling
- Error recovery

### 4. retry-engine

Automatic retry with backoff.

**API:**
```typescript
interface RetryEngineAPI {
  scheduleRetry(operation: Operation): void
  cancelRetry(operationId: string): void
  cancelAllRetries(): void
  getRetryTime(operationId: string): number | null
  getRetryAttempt(operationId: string): number
}
```

**Backoff Strategies:**

```typescript
// Exponential: 1s, 2s, 4s, 8s, 16s, 30s (capped)
exponential(attempt, baseDelay) = min(baseDelay * 2^(attempt-1), maxDelay)

// Linear: 1s, 2s, 3s, 4s, 5s
linear(attempt, baseDelay) = min(baseDelay * attempt, maxDelay)

// Fibonacci: 1s, 1s, 2s, 3s, 5s, 8s, 13s
fibonacci(attempt, baseDelay) = min(fib(attempt) * baseDelay, maxDelay)
```

**Jitter:**
```typescript
jitter(delay, factor) = delay * (1 + random(-factor, factor))
```

### 5. conflict-resolver

Conflict detection and resolution.

**API:**
```typescript
interface ConflictResolverAPI {
  detect(operation: Operation, serverResponse: unknown): boolean
  resolve(conflict: ConflictData): Promise<ConflictResolution>
  setStrategy(strategy: ConflictStrategy): void
  getStrategy(): ConflictStrategy
}
```

**Detection Methods:**
1. HTTP 409 Conflict status
2. Version/ETag mismatch in response
3. Custom detection function

**Built-in Strategies:**
- **last-write-wins**: Compare `updatedAt` timestamps
- **server-wins**: Always accept server data
- **client-wins**: Always keep client data
- **manual**: Emit event and wait for user resolution
- **custom**: Call custom handler function

## Optional Plugins

### 6. storage-localstorage

localStorage fallback.

**Usage:**
```typescript
import { localStorageAdapter } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  storage: localStorageAdapter({ key: 'my-sync-queue' })
})
```

**Limitations:**
- 5MB storage limit
- Synchronous operations
- String-based (JSON serialization)

### 7. batching

Batch multiple operations.

**Usage:**
```typescript
import { batching } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [batching({
    maxBatchSize: 10,
    maxWaitTime: 5000,
    batchExecutor: async (ops) => {
      const res = await fetch('/api/batch', {
        method: 'POST',
        body: JSON.stringify(ops)
      })
      return res.json()
    }
  })]
})
```

### 8. compression

Payload compression using LZ-string.

**Usage:**
```typescript
import { compression } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [compression({
    threshold: 1024,  // Only compress > 1KB
    algorithm: 'lz-string'
  })]
})
```

### 9. encryption

Payload encryption using Web Crypto API.

**Usage:**
```typescript
import { encryption } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [encryption({
    key: async () => await getEncryptionKey(),
    algorithm: 'aes-gcm'
  })]
})
```

### 10. background-sync

Service Worker integration.

**Usage:**
```typescript
// Main thread
import { backgroundSync } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [backgroundSync({ tag: 'synckit-sync' })]
})

// Service Worker
import { registerSyncHandler } from '@oxog/synckit/sw'

registerSyncHandler({
  tag: 'synckit-sync',
  onSync: async () => {
    // Process queue
  }
})
```

### 11. sync-ui

Visual debugging panel.

**Usage:**
```typescript
import { syncUI } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [syncUI({
    position: 'bottom-right',
    shortcut: 'ctrl+shift+s'
  })]
})
```

**Features:**
- Real-time queue visualization
- Operation status indicators
- Manual controls (retry, remove, clear)
- Conflict resolution dialog
- Draggable/resizable
- Keyboard shortcut

### 12. analytics

Metrics and reporting.

**Usage:**
```typescript
import { analytics } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [analytics({
    trackOperations: true,
    trackConflicts: true,
    trackPerformance: true,
    onReport: (report) => sendToAnalytics(report)
  })]
})

const report = sync.getPlugin('analytics').api.getReport()
```

## Framework Adapters

### React (`@oxog/synckit/react`)

```typescript
import {
  SyncKitProvider,
  useSync,
  useSyncStatus,
  useSyncQueue,
  useSyncOperation,
  useOnline
} from '@oxog/synckit/react'

// Provider
<SyncKitProvider config={...} plugins={[...]}>
  <App />
</SyncKitProvider>

// Hooks
const { push, remove, retry, isOnline } = useSync()
const { pending, syncing, failed } = useSyncStatus()
const queue = useSyncQueue()
const operation = useSyncOperation(operationId)
const isOnline = useOnline()
```

### Vue (`@oxog/synckit/vue`)

```typescript
import {
  createSyncKit,
  useSync,
  useSyncStatus,
  useSyncQueue,
  useOnline
} from '@oxog/synckit/vue'

// Plugin installation
app.use(createSyncKit({ ... }))

// Composition API
const { push, remove, isOnline } = useSync()
const { pending, syncing } = useSyncStatus()
const queue = useSyncQueue()  // Ref<Operation[]>
```

### Svelte (`@oxog/synckit/svelte`)

```typescript
import {
  createSyncStore,
  syncStore,
  statusStore,
  queueStore,
  onlineStore
} from '@oxog/synckit/svelte'

// Initialize
createSyncStore({ ... })

// Component
$syncStore.push({ ... })
$statusStore.pending
$queueStore // Operation[]
$onlineStore // boolean
```

## Package Exports

```json
{
  "name": "@oxog/synckit",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./plugins": {
      "import": "./dist/plugins/index.js",
      "require": "./dist/plugins/index.cjs",
      "types": "./dist/plugins/index.d.ts"
    },
    "./sw": {
      "import": "./dist/sw/index.js",
      "require": "./dist/sw/index.cjs",
      "types": "./dist/sw/index.d.ts"
    },
    "./react": {
      "import": "./dist/react/index.js",
      "require": "./dist/react/index.cjs",
      "types": "./dist/react/index.d.ts"
    },
    "./vue": {
      "import": "./dist/vue/index.js",
      "require": "./dist/vue/index.cjs",
      "types": "./dist/vue/index.d.ts"
    },
    "./svelte": {
      "import": "./dist/svelte/index.js",
      "require": "./dist/svelte/index.cjs",
      "types": "./dist/svelte/index.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "dependencies": {},
  "peerDependencies": {
    "react": ">=17.0.0",
    "vue": ">=3.0.0",
    "svelte": ">=3.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "vue": { "optional": true },
    "svelte": { "optional": true }
  }
}
```

## Browser Support

- **Chrome**: >= 87
- **Firefox**: >= 78
- **Safari**: >= 14
- **Edge**: >= 87

**Required APIs:**
- IndexedDB (fallback to localStorage)
- Promises
- fetch (user-provided executor)
- ES6+ features

**Optional APIs:**
- Web Crypto API (encryption plugin)
- Background Sync API (background-sync plugin)
- Network Information API (network-monitor plugin)
- Service Workers (background-sync plugin)

## Performance Targets

- **Bundle Size**: < 30KB (core, minified + gzip)
- **Tree-shaking**: Full support for unused plugins
- **Memory**: < 10MB for 1000 queued operations
- **Storage**: IndexedDB efficient for > 10,000 operations
- **Push Latency**: < 10ms (including persistence)
- **Sync Latency**: Depends on network + executor
- **Startup Time**: < 100ms (loading from IndexedDB)

## Security Considerations

1. **Storage**: Data stored in IndexedDB is unencrypted by default
2. **Encryption**: Use encryption plugin for sensitive data
3. **Validation**: Always validate data loaded from storage
4. **Quota**: Handle storage quota exceeded gracefully
5. **XSS**: Sanitize data before rendering in UI
6. **CSRF**: Use proper authentication in executor
7. **Clear on Logout**: Always clear queue when user logs out

## Testing Requirements

1. **Unit Tests**: 100% coverage for all modules
2. **Integration Tests**: Full offline/online scenarios
3. **E2E Tests**: Real browser with IndexedDB
4. **Conflict Tests**: All resolution strategies
5. **Retry Tests**: All backoff strategies
6. **Storage Tests**: IndexedDB and localStorage
7. **Framework Tests**: React, Vue, Svelte adapters
8. **Plugin Tests**: All core and optional plugins

## Documentation Requirements

1. **README.md**: Quick start, installation, basic usage
2. **API Reference**: Complete TypeScript definitions
3. **Guides**: Offline-first, conflict resolution, plugins
4. **Examples**: Todo app, notes app, chat app
5. **Website**: Interactive playground, visual demos
6. **JSDoc**: All public APIs documented

## Success Metrics

1. Zero runtime dependencies ✓
2. 100% test coverage ✓
3. 100% test pass rate ✓
4. Full TypeScript support ✓
5. Tree-shakeable ✓
6. Framework adapters for React, Vue, Svelte ✓
7. Comprehensive documentation ✓
8. Interactive playground ✓
9. Production-ready ✓

---

**This specification is complete and ready for implementation.**
