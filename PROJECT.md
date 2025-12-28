# SyncKit - Zero-Dependency Offline-First Data Sync Toolkit

## Package Identity

- **NPM Package**: `@oxog/synckit`
- **GitHub Repository**: `https://github.com/ersinkoc/synckit`
- **Documentation Site**: `https://synckit.oxog.dev`
- **License**: MIT
- **Author**: Ersin KOÇ

**NO social media, Discord, email, or external links.**

## Package Description

Zero-dependency offline-first data sync toolkit with micro-kernel plugin architecture.

SyncKit is a comprehensive offline-first synchronization solution for web applications. It queues operations when offline, automatically syncs when back online, handles conflicts with multiple resolution strategies, supports optimistic updates, and persists the queue to IndexedDB. Built on a micro-kernel architecture with powerful plugin system, it includes priority queuing, batching, background sync, and framework adapters for React, Vue, and Svelte—all without any runtime dependencies.

---

## NON-NEGOTIABLE RULES

These rules are ABSOLUTE and must be followed without exception:

### 1. ZERO DEPENDENCIES
```json
{
  "dependencies": {}  // MUST BE EMPTY - NO EXCEPTIONS
}
```
Implement EVERYTHING from scratch. No runtime dependencies allowed.

### 2. 100% TEST COVERAGE
- Every line of code must be tested
- Every branch must be tested
- All tests must pass (100% success rate)
- Use Vitest for testing

### 3. DEVELOPMENT WORKFLOW
Create these documents FIRST, before any code:
1. **SPECIFICATION.md** - Complete package specification
2. **IMPLEMENTATION.md** - Architecture and design decisions
3. **TASKS.md** - Ordered task list with dependencies

Only after these documents are complete, implement the code following TASKS.md sequentially.

### 4. TYPESCRIPT STRICT MODE
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

### 5. NO EXTERNAL LINKS
- ❌ No social media (Twitter, LinkedIn, etc.)
- ❌ No Discord/Slack links
- ❌ No email addresses
- ❌ No donation/sponsor links
- ✅ Only GitHub repo and documentation site allowed

---

## ARCHITECTURE: MICRO-KERNEL + PLUGIN SYSTEM

### Kernel Responsibilities

```typescript
interface Kernel<TPayload = unknown, TResult = unknown> {
  // Queue operations
  push(operation: OperationInput<TPayload>): PushResult
  remove(operationId: string): boolean
  clear(): void
  getQueue(): Operation<TPayload>[]
  getOperation(id: string): Operation<TPayload> | undefined
  
  // Queue status
  getStatus(): QueueStatus
  isPending(operationId: string): boolean
  
  // Sync control
  pause(): void
  resume(): void
  isPaused(): boolean
  retry(operationId: string): Promise<SyncResult<TResult>>
  retryAll(): Promise<SyncResult<TResult>[]>
  sync(): Promise<SyncResult<TResult>[]>
  
  // Network status
  isOnline(): boolean
  setOnline(online: boolean): void
  
  // Batch operations
  batch(batchId: string, operations: OperationInput<TPayload>[]): string
  
  // Plugin management
  register(plugin: Plugin): void
  unregister(pluginName: string): void
  getPlugin<P extends Plugin>(name: string): P | undefined
  listPlugins(): PluginInfo[]
  
  // Event system
  emit(event: KernelEvent): void
  on<E extends EventType>(eventType: E, handler: EventHandler<E>): Unsubscribe
  off<E extends EventType>(eventType: E, handler: EventHandler<E>): void
  
  // Lifecycle
  init(): Promise<void>
  destroy(): Promise<void>
  
  // Configuration
  configure(options: Partial<KernelOptions>): void
  getOptions(): KernelOptions
}

interface KernelOptions<TPayload = unknown, TResult = unknown> {
  name: string                                    // Unique identifier for storage
  storage: 'indexeddb' | 'localstorage' | StorageAdapter
  executor: Executor<TPayload, TResult>           // Function to execute operations
  conflictStrategy: ConflictStrategy
  onConflict?: ConflictHandler<TPayload, TResult>
  retry: RetryOptions
  plugins?: Plugin[]
  autoSync?: boolean                              // Auto sync when online (default: true)
  syncInterval?: number                           // Polling interval when online (default: 0 = disabled)
}

type Executor<TPayload, TResult> = (operation: Operation<TPayload>) => Promise<TResult>

interface RetryOptions {
  maxAttempts: number           // Default: 5
  backoff: 'linear' | 'exponential' | BackoffFunction
  baseDelay: number             // Default: 1000ms
  maxDelay: number              // Default: 30000ms
}

type BackoffFunction = (attempt: number, baseDelay: number) => number
```

### Operation Types

```typescript
interface Operation<TPayload = unknown> {
  id: string
  resource: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string
  payload: TPayload
  priority: Priority
  status: OperationStatus
  createdAt: number
  updatedAt: number
  attempts: number
  lastAttempt: number | null
  lastError: string | null
  batchId: string | null
  metadata: Record<string, unknown>
}

interface OperationInput<TPayload = unknown> {
  id?: string                   // Auto-generated if not provided
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
  | 'pending'
  | 'syncing'
  | 'success'
  | 'failed'
  | 'conflict'
  | 'cancelled'

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
```

### Conflict Resolution

```typescript
type ConflictStrategy = 
  | 'last-write-wins'
  | 'server-wins'
  | 'client-wins'
  | 'manual'
  | 'custom'

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

### Plugin Interface

```typescript
interface Plugin {
  // Identity
  name: string
  version: string
  type: 'core' | 'optional'
  
  // Lifecycle
  install(kernel: Kernel): void | Promise<void>
  uninstall(): void | Promise<void>
  
  // Hooks (all optional)
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
  
  // Plugin can expose its own API
  api?: Record<string, unknown>
}

interface PluginInfo {
  name: string
  version: string
  type: 'core' | 'optional'
  enabled: boolean
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

interface BaseEvent {
  type: EventType
  timestamp: number
}

interface OnlineEvent extends BaseEvent {
  type: 'online'
}

interface OfflineEvent extends BaseEvent {
  type: 'offline'
}

interface PushEvent extends BaseEvent {
  type: 'push'
  operation: Operation
  optimistic: boolean
}

interface SyncStartEvent extends BaseEvent {
  type: 'sync-start'
  operation: Operation
}

interface SyncSuccessEvent extends BaseEvent {
  type: 'sync-success'
  operation: Operation
  result: unknown
  duration: number
}

interface SyncErrorEvent extends BaseEvent {
  type: 'sync-error'
  operation: Operation
  error: Error
  willRetry: boolean
  attempt: number
}

interface ConflictEvent extends BaseEvent {
  type: 'conflict'
  operation: Operation
  serverData: unknown
  localData: unknown
  resolution: ConflictResolution | null
}

interface QueueChangeEvent extends BaseEvent {
  type: 'queue-change'
  queue: Operation[]
  added: Operation[]
  removed: Operation[]
  updated: Operation[]
}

interface StatusChangeEvent extends BaseEvent {
  type: 'status-change'
  status: QueueStatus
  previousStatus: QueueStatus
}

interface BatchStartEvent extends BaseEvent {
  type: 'batch-start'
  batchId: string
  operations: Operation[]
}

interface BatchCompleteEvent extends BaseEvent {
  type: 'batch-complete'
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

type EventHandler<E extends EventType> = (event: Extract<KernelEvent, { type: E }>) => void
type Unsubscribe = () => void
```

### Sync Result

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

---

## CORE PLUGINS (5 Total - Always Loaded)

### 1. queue-manager

Core queue operations with priority sorting.

```typescript
interface QueueManagerAPI {
  // Queue operations
  enqueue(operation: Operation): void
  dequeue(): Operation | undefined
  peek(): Operation | undefined
  remove(id: string): boolean
  update(id: string, updates: Partial<Operation>): boolean
  clear(): void
  
  // Query
  getAll(): Operation[]
  getByStatus(status: OperationStatus): Operation[]
  getByPriority(priority: Priority): Operation[]
  getByResource(resource: string): Operation[]
  getBatch(batchId: string): Operation[]
  find(predicate: (op: Operation) => boolean): Operation[]
  
  // Stats
  count(): number
  countByStatus(): Record<OperationStatus, number>
}

interface QueueManagerOptions {
  maxSize?: number              // Max queue size (default: unlimited)
  priorityOrder?: Priority[]    // Custom priority order
}
```

**Implementation Notes:**
- Priority queue using heap or sorted array
- Priority order: critical > high > normal > low
- FIFO within same priority
- Efficient O(log n) enqueue/dequeue

### 2. network-monitor

Online/offline detection.

```typescript
interface NetworkMonitorAPI {
  isOnline(): boolean
  getConnectionType(): ConnectionType | null
  getEffectiveType(): EffectiveConnectionType | null
  onStatusChange(handler: (online: boolean) => void): Unsubscribe
}

type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'wifi' | 'wimax' | 'other' | 'none' | 'unknown'
type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g'

interface NetworkMonitorOptions {
  pingUrl?: string              // URL to ping for connectivity check
  pingInterval?: number         // Interval for ping checks (default: 30000)
  pingTimeout?: number          // Timeout for ping (default: 5000)
}
```

**Implementation Notes:**
- Uses `navigator.onLine` as primary signal
- Falls back to periodic ping for accuracy
- Uses Network Information API when available
- Debounces rapid online/offline changes

### 3. storage-indexeddb

IndexedDB persistence for queue.

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

interface IndexedDBStorageOptions {
  dbName?: string               // Default: 'synckit'
  storeName?: string            // Default: 'operations'
  version?: number              // Default: 1
}

// IndexedDB implementation
class IndexedDBStorage implements StorageAdapter {
  // Full implementation from scratch
}
```

**Implementation Notes:**
- Uses IndexedDB API directly (no wrapper library)
- Handles database versioning and upgrades
- Supports transactions for consistency
- Graceful fallback on IndexedDB errors

### 4. retry-engine

Automatic retry with backoff strategies.

```typescript
interface RetryEngineAPI {
  scheduleRetry(operation: Operation): void
  cancelRetry(operationId: string): void
  cancelAllRetries(): void
  getRetryTime(operationId: string): number | null
  getRetryAttempt(operationId: string): number
}

interface RetryEngineOptions {
  maxAttempts: number
  backoff: 'linear' | 'exponential' | 'fibonacci' | BackoffFunction
  baseDelay: number
  maxDelay: number
  jitter: boolean               // Add randomness to prevent thundering herd
  jitterFactor: number          // 0-1, default: 0.1
  retryOn?: (error: Error) => boolean  // Custom retry condition
}

// Backoff calculations
function exponentialBackoff(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
}

function linearBackoff(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * attempt, maxDelay)
}

function fibonacciBackoff(attempt: number, baseDelay: number): number {
  // Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13...
}
```

**Implementation Notes:**
- Non-blocking retry scheduling using setTimeout
- Respects maxDelay cap
- Optional jitter to prevent synchronized retries
- Cleans up scheduled retries on destroy

### 5. conflict-resolver

Conflict detection and resolution.

```typescript
interface ConflictResolverAPI {
  detect(operation: Operation, serverResponse: unknown): boolean
  resolve(conflict: ConflictData): Promise<ConflictResolution>
  setStrategy(strategy: ConflictStrategy): void
  getStrategy(): ConflictStrategy
}

interface ConflictResolverOptions {
  strategy: ConflictStrategy
  customResolver?: ConflictHandler
  detectConflict?: (operation: Operation, response: unknown) => boolean
}

// Built-in strategies
const strategies = {
  'last-write-wins': (conflict) => {
    return conflict.localTimestamp > conflict.serverTimestamp ? 'client' : 'server'
  },
  'server-wins': () => 'server',
  'client-wins': () => 'client',
  'manual': async (conflict) => {
    // Emit event and wait for resolution
  },
}
```

**Conflict Detection:**
- HTTP 409 Conflict status
- Version mismatch in response
- ETag mismatch
- Custom detection function

---

## OPTIONAL PLUGINS (7 Total)

### 6. storage-localstorage

localStorage fallback for simpler use cases.

```typescript
import { localStorageAdapter } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  storage: localStorageAdapter({ key: 'my-sync-queue' }),
})

interface LocalStorageOptions {
  key: string                   // localStorage key
  serialize?: (queue: Operation[]) => string
  deserialize?: (data: string) => Operation[]
}

// Implements StorageAdapter interface
class LocalStorageAdapter implements StorageAdapter {
  // Full implementation
}
```

**Implementation Notes:**
- Stores entire queue as JSON string
- 5MB limit consideration
- Synchronous but wrapped in Promise for interface compatibility
- Fallback when IndexedDB unavailable

### 7. batching

Group multiple operations into single request.

```typescript
import { batching } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [batching({
    maxBatchSize: 10,
    maxWaitTime: 5000,
    batchExecutor: async (operations) => {
      // Send all operations in single request
      return fetch('/api/batch', {
        method: 'POST',
        body: JSON.stringify(operations),
      })
    },
  })],
})

// Manual batching
sync.batch('my-batch', [
  { resource: 'users', method: 'PUT', payload: {...} },
  { resource: 'settings', method: 'PUT', payload: {...} },
])

interface BatchingOptions {
  maxBatchSize: number          // Max operations per batch
  maxWaitTime: number           // Max time to wait for batch to fill
  batchExecutor: BatchExecutor
  shouldBatch?: (op: Operation) => boolean
  groupBy?: (op: Operation) => string  // Group operations by key
}

type BatchExecutor = (operations: Operation[]) => Promise<BatchResult[]>

interface BatchResult {
  operationId: string
  success: boolean
  result: unknown
  error: Error | null
}

interface BatchingAPI {
  createBatch(batchId: string, operations: OperationInput[]): void
  addToBatch(batchId: string, operation: OperationInput): void
  executeBatch(batchId: string): Promise<BatchResult[]>
  cancelBatch(batchId: string): void
  getPendingBatches(): string[]
}
```

**Implementation Notes:**
- All-or-nothing semantics option
- Partial success handling
- Automatic batching based on timing/size
- Manual batch control

### 8. compression

Payload compression for large data.

```typescript
import { compression } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [compression({
    threshold: 1024,            // Only compress > 1KB
    algorithm: 'lz-string',
  })],
})

interface CompressionOptions {
  threshold: number             // Bytes, default: 1024
  algorithm: 'lz-string' | 'custom'
  compress?: (data: string) => string
  decompress?: (data: string) => string
}

interface CompressionAPI {
  compress(data: unknown): string
  decompress(data: string): unknown
  getCompressionRatio(): number
  getStats(): CompressionStats
}

interface CompressionStats {
  totalOriginal: number
  totalCompressed: number
  ratio: number
  operationsCompressed: number
}
```

**Implementation Notes:**
- LZ-string implementation from scratch
- Only compresses payloads above threshold
- Stores compression flag in metadata
- Decompresses transparently on read

### 9. encryption

Payload encryption for sensitive data.

```typescript
import { encryption } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [encryption({
    key: 'my-secret-key',       // Or async key provider
    algorithm: 'aes-gcm',
  })],
})

interface EncryptionOptions {
  key: string | (() => Promise<string>)
  algorithm: 'aes-gcm' | 'aes-cbc'
  encryptFields?: string[]      // Only encrypt specific fields
}

interface EncryptionAPI {
  encrypt(data: unknown): Promise<string>
  decrypt(data: string): Promise<unknown>
  rotateKey(newKey: string): Promise<void>
  isEncrypted(operation: Operation): boolean
}
```

**Implementation Notes:**
- Uses Web Crypto API (SubtleCrypto)
- AES-GCM for authenticated encryption
- Key derivation from password using PBKDF2
- IV/nonce generation for each encryption

### 10. background-sync

Service Worker integration for true background sync.

```typescript
// Main thread
import { backgroundSync } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [backgroundSync({
    tag: 'synckit-sync',
    minInterval: 60000,
  })],
})

// Service Worker (sw.js)
import { registerSyncHandler } from '@oxog/synckit/sw'

registerSyncHandler({
  tag: 'synckit-sync',
  onSync: async () => {
    // Process queue
  },
})

interface BackgroundSyncOptions {
  tag: string                   // Sync registration tag
  minInterval?: number          // Minimum time between syncs
}

interface BackgroundSyncAPI {
  register(): Promise<void>
  unregister(): Promise<void>
  isRegistered(): Promise<boolean>
  trigger(): Promise<void>
}

// Service Worker helpers
function registerSyncHandler(options: SyncHandlerOptions): void
function processSyncQueue(storageKey: string): Promise<void>
```

**Implementation Notes:**
- Uses Background Sync API when available
- Falls back to periodic sync registration
- Handles service worker lifecycle
- Communicates via postMessage

### 11. sync-ui

Visual debugging panel.

```typescript
import { syncUI, SyncPanel } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [syncUI({
    position: 'bottom-right',
    shortcut: 'ctrl+shift+s',
  })],
})

// React component for panel
<SyncPanel />

interface SyncUIOptions {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  shortcut: string
  draggable: boolean
  resizable: boolean
  theme: 'dark' | 'light' | 'auto'
  showConflictDialog: boolean
}

interface SyncUIAPI {
  open(): void
  close(): void
  toggle(): void
  isOpen(): boolean
  showConflict(conflict: ConflictData): Promise<ConflictResolution>
}
```

**Panel Features:**
- Real-time queue visualization
- Operation status indicators
- Manual retry/remove controls
- Conflict resolution dialog
- Network status indicator
- Pause/resume controls
- Clear queue button
- Keyboard shortcut toggle

**Panel Layout:**
```
┌─ SyncKit ───────────────────────── [_] [□] [×]
├─────────────────────────────────────────────────
│  Status: 🟢 Online          Queue: 3 pending
├─────────────────────────────────────────────────
│  Operation Queue
│  ┌──────────────────────────────────────────┐
│  │ 🔄 POST /posts         syncing...       │
│  │ ⏳ PUT /profile        pending (high)   │
│  │ ⏳ DELETE /comments/5  pending (normal) │
│  │ ❌ PUT /settings       failed (retry 3) │
│  └──────────────────────────────────────────┘
├─────────────────────────────────────────────────
│  [⏸️ Pause] [🔄 Retry All] [🗑️ Clear]
└─────────────────────────────────────────────────
```

### 12. analytics

Sync metrics and reporting.

```typescript
import { analytics } from '@oxog/synckit/plugins'

const sync = createSyncKit({
  plugins: [analytics({
    trackOperations: true,
    trackConflicts: true,
    trackPerformance: true,
    onReport: (report) => sendToAnalytics(report),
  })],
})

interface AnalyticsOptions {
  trackOperations: boolean
  trackConflicts: boolean
  trackPerformance: boolean
  reportInterval?: number       // Auto-report interval
  onReport?: (report: AnalyticsReport) => void
}

interface AnalyticsAPI {
  getReport(): AnalyticsReport
  getOperationStats(): OperationStats
  getConflictStats(): ConflictStats
  getPerformanceStats(): PerformanceStats
  reset(): void
}

interface AnalyticsReport {
  period: { start: number; end: number }
  operations: OperationStats
  conflicts: ConflictStats
  performance: PerformanceStats
  network: NetworkStats
}

interface OperationStats {
  total: number
  successful: number
  failed: number
  retried: number
  byResource: Record<string, number>
  byMethod: Record<string, number>
  byPriority: Record<Priority, number>
}

interface ConflictStats {
  total: number
  resolved: number
  byStrategy: Record<ConflictStrategy, number>
  byResource: Record<string, number>
}

interface PerformanceStats {
  averageSyncTime: number
  medianSyncTime: number
  p95SyncTime: number
  totalSyncTime: number
  averageQueueWaitTime: number
  averageRetryCount: number
}

interface NetworkStats {
  onlineTime: number
  offlineTime: number
  offlinePeriods: number
  averageOfflineDuration: number
}
```

---

## FRAMEWORK ADAPTERS

### 13. React Adapter (`@oxog/synckit/react`)

```tsx
import {
  SyncKitProvider,
  useSync,
  useSyncStatus,
  useSyncQueue,
  useSyncOperation,
  useOnline,
} from '@oxog/synckit/react'

// Provider
function App() {
  return (
    <SyncKitProvider
      config={{
        name: 'my-app',
        storage: 'indexeddb',
        executor: async (op) => {
          const res = await fetch(`/api/${op.resource}`, {
            method: op.method,
            body: JSON.stringify(op.payload),
          })
          return res.json()
        },
        conflictStrategy: 'last-write-wins',
        retry: { maxAttempts: 5, backoff: 'exponential' },
      }}
      plugins={[compression(), analytics()]}
    >
      <MyApp />
    </SyncKitProvider>
  )
}

// Main hook
function CreatePost() {
  const {
    push,
    remove,
    retry,
    retryAll,
    pause,
    resume,
    clear,
    isOnline,
    isPaused,
    sync,
  } = useSync()

  const handleSubmit = async (data: PostData) => {
    const { operationId, rollback } = push({
      resource: 'posts',
      method: 'POST',
      payload: data,
      priority: 'high',
      optimistic: true,
      onSuccess: (result) => {
        toast.success('Post created!')
      },
      onError: (error) => {
        toast.error('Failed to create post')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {!isOnline && <OfflineBadge />}
      {/* form fields */}
    </form>
  )
}

// Status hook
function SyncStatusBar() {
  const { pending, syncing, failed, total, isProcessing } = useSyncStatus()

  return (
    <div>
      {pending > 0 && <span>{pending} pending</span>}
      {syncing > 0 && <span>{syncing} syncing</span>}
      {failed > 0 && <span className="error">{failed} failed</span>}
    </div>
  )
}

// Queue hook
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

// Single operation hook
function OperationStatus({ operationId }: { operationId: string }) {
  const operation = useSyncOperation(operationId)

  if (!operation) return null

  return (
    <div>
      Status: {operation.status}
      {operation.status === 'failed' && (
        <span>Attempts: {operation.attempts}</span>
      )}
    </div>
  )
}

// Online status hook
function OnlineIndicator() {
  const isOnline = useOnline()

  return (
    <span className={isOnline ? 'online' : 'offline'}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </span>
  )
}

// Types
interface SyncKitProviderProps {
  children: React.ReactNode
  config: SyncKitConfig
  plugins?: Plugin[]
}

interface UseSyncReturn {
  push: (operation: OperationInput) => PushResult
  remove: (operationId: string) => boolean
  retry: (operationId: string) => Promise<SyncResult>
  retryAll: () => Promise<SyncResult[]>
  pause: () => void
  resume: () => void
  clear: () => void
  sync: () => Promise<SyncResult[]>
  batch: (batchId: string, operations: OperationInput[]) => string
  isOnline: boolean
  isPaused: boolean
}

interface UseSyncStatusReturn {
  pending: number
  syncing: number
  failed: number
  total: number
  isProcessing: boolean
  isPaused: boolean
  isOnline: boolean
}
```

### 14. Vue Adapter (`@oxog/synckit/vue`)

```typescript
import {
  createSyncKit,
  useSync,
  useSyncStatus,
  useSyncQueue,
  useOnline,
  provideSyncKit,
  injectSyncKit,
} from '@oxog/synckit/vue'

// Plugin installation
const app = createApp(App)
app.use(createSyncKit({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => { ... },
  conflictStrategy: 'last-write-wins',
}))

// Composition API
const {
  push,
  remove,
  retry,
  pause,
  resume,
  isOnline,      // Ref<boolean>
  isPaused,      // Ref<boolean>
} = useSync()

const {
  pending,       // Ref<number>
  syncing,       // Ref<number>
  failed,        // Ref<number>
} = useSyncStatus()

const queue = useSyncQueue()  // Ref<Operation[]>
const online = useOnline()    // Ref<boolean>

// Template
<template>
  <div>
    <span v-if="!isOnline">Offline</span>
    <span v-if="pending > 0">{{ pending }} pending</span>
    
    <button @click="push({ resource: 'posts', method: 'POST', payload: data })">
      Create Post
    </button>
  </div>
</template>
```

### 15. Svelte Adapter (`@oxog/synckit/svelte`)

```typescript
import {
  createSyncStore,
  syncStore,
  statusStore,
  queueStore,
  onlineStore,
} from '@oxog/synckit/svelte'

// Initialize
const sync = createSyncStore({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (op) => { ... },
  conflictStrategy: 'last-write-wins',
})

// Svelte component
<script>
  import { syncStore, statusStore, queueStore, onlineStore } from '@oxog/synckit/svelte'

  function createPost(data) {
    $syncStore.push({
      resource: 'posts',
      method: 'POST',
      payload: data,
    })
  }
</script>

{#if !$onlineStore}
  <span>Offline</span>
{/if}

{#if $statusStore.pending > 0}
  <span>{$statusStore.pending} pending</span>
{/if}

<button on:click={() => createPost(data)}>
  Create Post
</button>

<ul>
  {#each $queueStore as operation}
    <li>{operation.method} {operation.resource} - {operation.status}</li>
  {/each}
</ul>

// Store types
interface SyncStore extends Writable<SyncStoreValue> {
  push: (operation: OperationInput) => PushResult
  remove: (operationId: string) => boolean
  retry: (operationId: string) => Promise<SyncResult>
  retryAll: () => Promise<SyncResult[]>
  pause: () => void
  resume: () => void
  clear: () => void
}

interface SyncStoreValue {
  isOnline: boolean
  isPaused: boolean
}

interface StatusStore extends Readable<QueueStatus> {}
interface QueueStore extends Readable<Operation[]> {}
interface OnlineStore extends Readable<boolean> {}
```

---

## PUBLIC API (Vanilla JS)

```typescript
// Main exports
import {
  // Factory
  createSyncKit,
  
  // Types
  type SyncKit,
  type Operation,
  type OperationInput,
  type SyncResult,
  type QueueStatus,
  type ConflictData,
  type ConflictResolution,
  type Plugin,
  type StorageAdapter,
} from '@oxog/synckit'

// Create instance
const sync = createSyncKit<PayloadType, ResultType>({
  name: 'my-app',
  storage: 'indexeddb',
  executor: async (operation) => {
    const response = await fetch(`/api/${operation.resource}`, {
      method: operation.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.payload),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return response.json()
  },
  conflictStrategy: 'last-write-wins',
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000,
  },
  autoSync: true,
})

// Initialize (loads queue from storage)
await sync.init()

// Push operations
const { operationId, rollback } = sync.push({
  resource: 'posts',
  method: 'POST',
  payload: { title: 'Hello', body: 'World' },
  priority: 'high',
  optimistic: true,
  onSuccess: (result) => console.log('Success:', result),
  onError: (error) => console.error('Error:', error),
})

// Queue management
sync.getQueue()               // All operations
sync.getStatus()              // { pending, syncing, failed, total }
sync.remove(operationId)      // Remove operation
sync.clear()                  // Clear all

// Sync control
sync.pause()                  // Pause processing
sync.resume()                 // Resume processing
sync.retry(operationId)       // Retry single operation
sync.retryAll()               // Retry all failed
sync.sync()                   // Force sync now

// Network status
sync.isOnline()
sync.setOnline(true)          // Manual override

// Events
sync.on('online', () => console.log('Back online!'))
sync.on('offline', () => console.log('Gone offline'))
sync.on('sync-success', (event) => console.log('Synced:', event.operation))
sync.on('sync-error', (event) => console.error('Failed:', event.error))
sync.on('conflict', (event) => console.log('Conflict:', event))
sync.on('queue-change', (event) => console.log('Queue:', event.queue))

// Batching
sync.batch('user-updates', [
  { resource: 'profile', method: 'PUT', payload: { name: 'John' } },
  { resource: 'settings', method: 'PUT', payload: { theme: 'dark' } },
])

// Cleanup
await sync.destroy()
```

---

## TYPE DEFINITIONS

```typescript
// Core types
export interface SyncKit<TPayload = unknown, TResult = unknown> {
  // ... Kernel interface methods
}

export interface Operation<TPayload = unknown> {
  id: string
  resource: string
  method: string
  payload: TPayload
  priority: Priority
  status: OperationStatus
  createdAt: number
  updatedAt: number
  attempts: number
  lastAttempt: number | null
  lastError: string | null
  batchId: string | null
  metadata: Record<string, unknown>
}

export interface OperationInput<TPayload = unknown> {
  id?: string
  resource: string
  method: string
  payload: TPayload
  priority?: Priority
  optimistic?: boolean
  metadata?: Record<string, unknown>
  onSuccess?: (result: unknown) => void
  onError?: (error: Error) => void
}

export type Priority = 'critical' | 'high' | 'normal' | 'low'
export type OperationStatus = 'pending' | 'syncing' | 'success' | 'failed' | 'conflict' | 'cancelled'

export interface QueueStatus {
  pending: number
  syncing: number
  failed: number
  total: number
  isProcessing: boolean
  isPaused: boolean
  isOnline: boolean
}

export interface SyncResult<TResult = unknown> {
  operationId: string
  success: boolean
  result: TResult | null
  error: Error | null
  duration: number
  attempts: number
  conflict: boolean
  conflictResolution: ConflictResolution | null
}

export interface PushResult {
  operationId: string
  optimisticId: string | null
  rollback: () => void
}

// Conflict types
export type ConflictStrategy = 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual' | 'custom'

export interface ConflictData<TPayload = unknown, TResult = unknown> {
  operation: Operation<TPayload>
  serverData: TResult
  localData: TPayload
  serverTimestamp: number
  localTimestamp: number
}

export type ConflictResolution<TPayload = unknown> = 'server' | 'client' | { merged: TPayload }

export type ConflictHandler<TPayload, TResult> = (
  conflict: ConflictData<TPayload, TResult>
) => Promise<ConflictResolution<TPayload>>

// Plugin types
export interface Plugin { /* as defined above */ }
export interface StorageAdapter { /* as defined above */ }

// Event types
export type EventType = /* as defined above */
export type KernelEvent = /* as defined above */
export type EventHandler<E extends EventType> = /* as defined above */
export type Unsubscribe = () => void

// Config types
export interface SyncKitConfig<TPayload = unknown, TResult = unknown> {
  name: string
  storage: 'indexeddb' | 'localstorage' | StorageAdapter
  executor: (operation: Operation<TPayload>) => Promise<TResult>
  conflictStrategy?: ConflictStrategy
  onConflict?: ConflictHandler<TPayload, TResult>
  retry?: Partial<RetryOptions>
  plugins?: Plugin[]
  autoSync?: boolean
  syncInterval?: number
}

export interface RetryOptions {
  maxAttempts: number
  backoff: 'linear' | 'exponential' | 'fibonacci' | BackoffFunction
  baseDelay: number
  maxDelay: number
  jitter?: boolean
  jitterFactor?: number
}
```

---

## TECHNICAL REQUIREMENTS

- **Runtime**: Browser (primary), Node.js (limited - no IndexedDB)
- **Module Format**: ESM + CJS (dual package)
- **Node.js Version**: >= 18 (for build/test)
- **TypeScript Version**: >= 5.0, strict mode
- **Full Generic Support**: All types properly generic

### Browser APIs Used

- `navigator.onLine` - Online status
- `IndexedDB` - Queue persistence
- `localStorage` - Fallback storage
- `fetch` - Network requests (user-provided executor)
- `Web Crypto API` - Encryption plugin
- `Background Sync API` - Service worker sync
- `Network Information API` - Connection type (optional)
- `BroadcastChannel` - Cross-tab communication (optional)

### Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./plugins": {
      "import": "./dist/plugins/index.js",
      "require": "./dist/plugins/index.cjs"
    },
    "./sw": {
      "import": "./dist/sw/index.js",
      "require": "./dist/sw/index.cjs"
    },
    "./react": {
      "import": "./dist/react/index.js",
      "require": "./dist/react/index.cjs"
    },
    "./vue": {
      "import": "./dist/vue/index.js",
      "require": "./dist/vue/index.cjs"
    },
    "./svelte": {
      "import": "./dist/svelte/index.js",
      "require": "./dist/svelte/index.cjs"
    }
  }
}
```

### Peer Dependencies

```json
{
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

---

## PROJECT STRUCTURE

```
synckit/
├── src/
│   ├── index.ts                    # Main entry, exports
│   ├── types.ts                    # All type definitions
│   │
│   ├── kernel/                     # Micro-kernel core
│   │   ├── index.ts
│   │   ├── kernel.ts               # Kernel implementation
│   │   ├── event-bus.ts            # Event system
│   │   └── plugin-registry.ts      # Plugin management
│   │
│   ├── plugins/                    # All plugins
│   │   ├── index.ts                # Optional plugins export
│   │   ├── core/                   # Core plugins (bundled)
│   │   │   ├── index.ts
│   │   │   ├── queue-manager.ts
│   │   │   ├── network-monitor.ts
│   │   │   ├── storage-indexeddb.ts
│   │   │   ├── retry-engine.ts
│   │   │   └── conflict-resolver.ts
│   │   │
│   │   └── optional/               # Optional plugins
│   │       ├── index.ts
│   │       ├── storage-localstorage.ts
│   │       ├── batching.ts
│   │       ├── compression.ts
│   │       ├── encryption.ts
│   │       ├── background-sync.ts
│   │       ├── analytics.ts
│   │       └── sync-ui/
│   │           ├── index.ts
│   │           ├── panel.tsx
│   │           ├── components/
│   │           │   ├── queue-list.tsx
│   │           │   ├── operation-item.tsx
│   │           │   ├── status-bar.tsx
│   │           │   ├── conflict-dialog.tsx
│   │           │   └── controls.tsx
│   │           ├── styles/
│   │           │   └── panel.css
│   │           └── utils/
│   │               ├── shadow-dom.ts
│   │               ├── draggable.ts
│   │               └── resizable.ts
│   │
│   ├── sw/                         # Service Worker utilities
│   │   ├── index.ts
│   │   ├── register.ts
│   │   └── handler.ts
│   │
│   ├── adapters/                   # Framework adapters
│   │   ├── react/
│   │   │   ├── index.ts
│   │   │   ├── provider.tsx
│   │   │   ├── context.ts
│   │   │   ├── use-sync.ts
│   │   │   ├── use-sync-status.ts
│   │   │   ├── use-sync-queue.ts
│   │   │   ├── use-sync-operation.ts
│   │   │   └── use-online.ts
│   │   │
│   │   ├── vue/
│   │   │   ├── index.ts
│   │   │   ├── plugin.ts
│   │   │   ├── use-sync.ts
│   │   │   ├── use-sync-status.ts
│   │   │   ├── use-sync-queue.ts
│   │   │   └── use-online.ts
│   │   │
│   │   └── svelte/
│   │       ├── index.ts
│   │       ├── store.ts
│   │       ├── status-store.ts
│   │       ├── queue-store.ts
│   │       └── online-store.ts
│   │
│   └── utils/                      # Internal utilities
│       ├── index.ts
│       ├── uid.ts                  # Unique ID generator
│       ├── priority-queue.ts       # Priority queue implementation
│       ├── backoff.ts              # Backoff calculations
│       ├── deep-clone.ts
│       ├── deep-equal.ts
│       ├── compress.ts             # LZ-string implementation
│       ├── crypto.ts               # Encryption utilities
│       └── timestamp.ts
│
├── tests/
│   ├── unit/
│   │   ├── kernel/
│   │   ├── plugins/
│   │   │   ├── core/
│   │   │   └── optional/
│   │   ├── adapters/
│   │   │   ├── react/
│   │   │   ├── vue/
│   │   │   └── svelte/
│   │   └── utils/
│   ├── integration/
│   │   ├── offline-sync.test.ts
│   │   ├── conflict-resolution.test.ts
│   │   ├── retry-engine.test.ts
│   │   ├── batching.test.ts
│   │   └── persistence.test.ts
│   └── fixtures/
│       ├── mock-server.ts
│       ├── test-operations.ts
│       └── test-storage.ts
│
├── examples/
│   ├── vanilla/
│   │   ├── basic/
│   │   ├── with-conflict-resolution/
│   │   └── with-background-sync/
│   ├── react/
│   │   ├── todo-app/
│   │   ├── notes-app/
│   │   └── chat-app/
│   ├── vue/
│   │   ├── todo-app/
│   │   └── form-app/
│   └── svelte/
│       ├── todo-app/
│       └── blog-app/
│
├── website/                        # Documentation site
│   ├── index.html
│   ├── docs/
│   │   ├── index.html
│   │   ├── getting-started.html
│   │   ├── concepts/
│   │   │   ├── index.html
│   │   │   ├── offline-first.html
│   │   │   ├── conflict-resolution.html
│   │   │   ├── optimistic-updates.html
│   │   │   └── background-sync.html
│   │   ├── api/
│   │   │   ├── index.html
│   │   │   ├── synckit.html
│   │   │   ├── operations.html
│   │   │   ├── events.html
│   │   │   └── plugins.html
│   │   ├── plugins/
│   │   │   ├── index.html
│   │   │   ├── core-plugins.html
│   │   │   ├── optional-plugins.html
│   │   │   └── custom-plugins.html
│   │   ├── frameworks/
│   │   │   ├── index.html
│   │   │   ├── react.html
│   │   │   ├── vue.html
│   │   │   └── svelte.html
│   │   ├── guides/
│   │   │   ├── index.html
│   │   │   ├── pwa-integration.html
│   │   │   ├── service-worker.html
│   │   │   └── testing.html
│   │   ├── examples/
│   │   │   └── [examples].html
│   │   └── playground/
│   │       └── index.html
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── 404.html
│
├── SPECIFICATION.md
├── IMPLEMENTATION.md
├── TASKS.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## DOCUMENTATION WEBSITE

Build documentation site for `https://synckit.oxog.dev`

### Technology Stack
- **Tailwind CSS** (via CDN)
- **Alpine.js** (via CDN)
- **Prism.js** for syntax highlighting
- **Static HTML** (no build step)

### Design Theme (Dark)
```css
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--bg-tertiary: #1f1f1f;
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--accent: #06b6d4;        /* Cyan - sync/connection theme */
--accent-hover: #0891b2;
--success: #22c55e;
--warning: #eab308;
--error: #ef4444;
--pending: #f59e0b;       /* Amber for pending */
--syncing: #3b82f6;       /* Blue for syncing */
--offline: #ef4444;       /* Red for offline */
--online: #22c55e;        /* Green for online */
```

### Required Pages

1. **Landing Page** - Hero, features, quick install, interactive demo
2. **Getting Started** - Installation, basic setup, first sync
3. **Concepts** - Offline-first, conflict resolution, optimistic updates
4. **API Reference** - Full documentation for SyncKit and plugins
5. **Plugins** - Core and optional plugin documentation
6. **Framework Guides** - React, Vue, Svelte integration
7. **Guides** - PWA integration, service worker, testing
8. **Examples** - Todo app, notes app, chat app
9. **Playground** - Interactive demo with offline simulation

### Special Features

- Offline/online toggle simulation
- Real-time queue visualization
- Conflict resolution demo
- Framework code tabs (React/Vue/Svelte)
- Copy-to-clipboard on all code blocks
- npm/yarn/pnpm tabs

---

## IMPLEMENTATION CHECKLIST

Before starting implementation:
- [ ] Create SPECIFICATION.md with complete package spec
- [ ] Create IMPLEMENTATION.md with architecture design
- [ ] Create TASKS.md with ordered task list

During implementation:
- [ ] Implement kernel first (foundation)
- [ ] Implement core plugins (5)
- [ ] Implement optional plugins (7)
- [ ] Implement service worker utilities
- [ ] Implement framework adapters (React, Vue, Svelte)
- [ ] Build Sync UI panel last
- [ ] Maintain 100% test coverage throughout
- [ ] Write JSDoc for all public APIs

Before completion:
- [ ] All tests passing (100% success)
- [ ] Coverage report shows 100%
- [ ] README.md complete
- [ ] CHANGELOG.md initialized
- [ ] Website functional
- [ ] Package builds without errors
- [ ] Tree-shaking works correctly
- [ ] Framework adapters tested with real apps
- [ ] Offline scenarios thoroughly tested

---

## CRITICAL IMPLEMENTATION NOTES

### Offline-First Mindset
- Queue is the source of truth when offline
- Always persist before acknowledging push
- Never lose user data
- Graceful degradation

### Queue Processing
- Process one operation at a time by default
- Respect priority order
- Stop on first failure (configurable)
- Clear completed operations from queue

### Conflict Detection
- Check HTTP status codes (409)
- Compare timestamps/versions
- ETag/If-Match headers
- Custom detection via executor response

### IndexedDB Implementation
- Handle IndexedDB not available (Safari private mode)
- Proper transaction handling
- Upgrade path for schema changes
- Error recovery

### Network Detection
- `navigator.onLine` is not always reliable
- Ping endpoint for accuracy
- Handle false positives
- Debounce rapid changes

### Service Worker Integration
- Don't assume SW availability
- Use postMessage for communication
- Handle SW lifecycle events
- Graceful fallback without SW

### Security
- Never store sensitive data unencrypted
- Clear queue on logout
- Validate all data from storage
- Handle storage quota exceeded

### Testing
- Mock IndexedDB for unit tests
- Mock network for offline tests
- Test retry scenarios
- Test conflict scenarios
- Test cross-tab scenarios

---

## BEGIN IMPLEMENTATION

Start by creating SPECIFICATION.md with the complete package specification. Then proceed with IMPLEMENTATION.md and TASKS.md before writing any actual code.

Remember: This package will be published to NPM. It must be production-ready, zero-dependency, fully tested, and professionally documented.

Offline reliability is the key differentiator - users must never lose data. Test extensively with network throttling, offline mode, and various failure scenarios.