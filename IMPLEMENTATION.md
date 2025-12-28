# SyncKit - Implementation Guide

## Architecture Overview

SyncKit is built using a **micro-kernel architecture** where:
- The kernel provides minimal core functionality
- All features are implemented as plugins
- Plugins communicate via events
- Clear separation of concerns

### Design Philosophy

1. **Micro-Kernel Pattern**: Minimal core + powerful plugins
2. **Event-Driven**: Loose coupling via pub/sub
3. **Plugin-First**: Everything is a plugin (even core features)
4. **Zero Dependencies**: Complete control and minimal bundle
5. **Type-Safe**: Full TypeScript with strict mode
6. **Testable**: Pure functions, dependency injection, mocking

## Core Components

### 1. Kernel (`src/kernel/kernel.ts`)

**Responsibilities:**
- Initialize and destroy lifecycle
- Plugin registry management
- Event bus coordination
- Configuration management
- Delegate to plugins for actual work

**Key Design Decisions:**

```typescript
class SyncKitKernel<TPayload = unknown, TResult = unknown> {
  private plugins: Map<string, Plugin>
  private eventBus: EventBus
  private config: KernelOptions<TPayload, TResult>
  private initialized: boolean = false

  async init(): Promise<void> {
    // 1. Initialize core plugins (order matters!)
    // 2. Load queue from storage
    // 3. Set up network monitoring
    // 4. Auto-sync if online + autoSync enabled
  }

  push(operation: OperationInput<TPayload>): PushResult {
    // 1. Run beforePush hooks (validation, transformation)
    // 2. Delegate to queue-manager plugin
    // 3. Delegate to storage plugin (persist)
    // 4. Emit 'push' event
    // 5. Trigger sync if online + not paused
    // 6. Return result with rollback function
  }

  async sync(): Promise<SyncResult<TResult>[]> {
    // 1. Get pending operations from queue-manager
    // 2. Process one at a time (by priority)
    // 3. Run beforeSync hooks
    // 4. Execute via executor function
    // 5. Handle conflicts via conflict-resolver
    // 6. Handle failures via retry-engine
    // 7. Run afterSync hooks
    // 8. Remove successful from queue
    // 9. Persist changes
    // 10. Emit events
  }
}
```

**Why this design?**
- Kernel doesn't know about queue data structures → delegated to plugin
- Kernel doesn't know about storage → delegated to plugin
- Kernel doesn't know about retries → delegated to plugin
- Kernel only orchestrates

### 2. Event Bus (`src/kernel/event-bus.ts`)

**Implementation:**

```typescript
class EventBus {
  private listeners: Map<EventType, Set<EventHandler<any>>>

  on<E extends EventType>(
    eventType: E,
    handler: EventHandler<E>
  ): Unsubscribe {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(handler)
    }
  }

  emit(event: KernelEvent): void {
    const handlers = this.listeners.get(event.type)
    if (handlers) {
      // Clone to avoid modification during iteration
      Array.from(handlers).forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error('Event handler error:', error)
          // Don't throw - one bad handler shouldn't break others
        }
      })
    }
  }
}
```

**Why this design?**
- Type-safe event handlers via generics
- Unsubscribe via closure (no manual tracking)
- Isolated errors (one bad handler doesn't affect others)
- Synchronous for simplicity (async events can cause race conditions)

### 3. Plugin Registry (`src/kernel/plugin-registry.ts`)

**Implementation:**

```typescript
class PluginRegistry {
  private plugins: Map<string, PluginWrapper>
  private kernel: SyncKit

  async register(plugin: Plugin): Promise<void> {
    // 1. Validate plugin (name, version, required methods)
    // 2. Check for conflicts (duplicate names)
    // 3. Wrap plugin with lifecycle tracking
    // 4. Call plugin.install(kernel)
    // 5. Register hooks with event bus
    // 6. Store in registry
  }

  async unregister(name: string): Promise<void> {
    // 1. Find plugin
    // 2. Call plugin.uninstall()
    // 3. Unsubscribe all hooks
    // 4. Remove from registry
  }

  getPlugin<P extends Plugin>(name: string): P | undefined {
    return this.plugins.get(name)?.plugin as P
  }
}

interface PluginWrapper {
  plugin: Plugin
  unsubscribes: Unsubscribe[]  // Track hook subscriptions
  installed: Date
}
```

**Why this design?**
- Wrapper tracks hook subscriptions for cleanup
- Validation prevents bad plugins
- Async install/uninstall for plugins that need setup
- Type-safe plugin retrieval via generics

## Core Plugins Implementation

### 1. Queue Manager (`src/plugins/core/queue-manager.ts`)

**Data Structure: Priority Queue**

```typescript
class PriorityQueue<T> {
  private heaps: Map<Priority, T[]>  // Separate heap per priority
  private readonly priorityOrder: Priority[] = [
    'critical', 'high', 'normal', 'low'
  ]

  enqueue(item: T, priority: Priority): void {
    // 1. Get or create heap for priority
    // 2. Add item to heap
    // 3. Bubble up (maintain heap property)
  }

  dequeue(): T | undefined {
    // 1. Check critical heap first
    // 2. Then high, normal, low
    // 3. Pop from first non-empty heap
    // 4. Bubble down (maintain heap property)
  }
}
```

**Why priority queue?**
- O(log n) enqueue/dequeue
- Efficient priority handling
- FIFO within same priority level
- Better than sorting on every operation

**Plugin Implementation:**

```typescript
class QueueManagerPlugin implements Plugin {
  name = 'queue-manager'
  version = '1.0.0'
  type = 'core' as const

  private queue: PriorityQueue<Operation>
  private operationsMap: Map<string, Operation>  // Fast lookup by ID

  install(kernel: SyncKit): void {
    this.api = {
      enqueue: (op) => {
        this.queue.enqueue(op, op.priority)
        this.operationsMap.set(op.id, op)
      },
      dequeue: () => {
        const op = this.queue.dequeue()
        if (op) this.operationsMap.delete(op.id)
        return op
      },
      remove: (id) => {
        const op = this.operationsMap.get(id)
        if (op) {
          this.queue.remove(op)  // O(n) - acceptable for manual removal
          this.operationsMap.delete(id)
          return true
        }
        return false
      },
      getAll: () => Array.from(this.operationsMap.values()),
      // ... other methods
    }
  }
}
```

### 2. Network Monitor (`src/plugins/core/network-monitor.ts`)

**Implementation:**

```typescript
class NetworkMonitorPlugin implements Plugin {
  name = 'network-monitor'
  version = '1.0.0'
  type = 'core' as const

  private isOnlineState: boolean = navigator.onLine
  private pingTimer: number | null = null
  private debounceTimer: number | null = null

  install(kernel: SyncKit): void {
    // Listen to browser events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Start ping checks if configured
    if (this.options.pingUrl) {
      this.startPingChecks()
    }

    this.api = {
      isOnline: () => this.isOnlineState,
      getConnectionType: () => {
        const conn = (navigator as any).connection
        return conn?.type || null
      },
      getEffectiveType: () => {
        const conn = (navigator as any).connection
        return conn?.effectiveType || null
      }
    }
  }

  private handleOnline = (): void => {
    this.debounce(() => {
      if (this.isOnlineState !== true) {
        this.isOnlineState = true
        this.kernel.emit({ type: 'online', timestamp: Date.now() })
      }
    })
  }

  private handleOffline = (): void => {
    this.debounce(() => {
      if (this.isOnlineState !== false) {
        this.isOnlineState = false
        this.kernel.emit({ type: 'offline', timestamp: Date.now() })
      }
    })
  }

  private debounce(fn: () => void): void {
    // Prevent rapid online/offline toggles
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = window.setTimeout(fn, 300)
  }

  private async pingCheck(): Promise<void> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.pingTimeout)

      const response = await fetch(this.options.pingUrl!, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      })

      clearTimeout(timeout)

      const isOnline = response.ok
      if (isOnline !== this.isOnlineState) {
        this.isOnlineState = isOnline
        this.kernel.emit({
          type: isOnline ? 'online' : 'offline',
          timestamp: Date.now()
        })
      }
    } catch (error) {
      // Network error = offline
      if (this.isOnlineState !== false) {
        this.isOnlineState = false
        this.kernel.emit({ type: 'offline', timestamp: Date.now() })
      }
    }
  }

  private startPingChecks(): void {
    this.pingTimer = window.setInterval(
      () => this.pingCheck(),
      this.options.pingInterval
    )
  }

  uninstall(): void {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    if (this.pingTimer) clearInterval(this.pingTimer)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
  }
}
```

**Why this design?**
- `navigator.onLine` is fast but unreliable
- Optional ping for accuracy
- Debounce prevents rapid toggling
- Cleanup in uninstall prevents memory leaks

### 3. Storage IndexedDB (`src/plugins/core/storage-indexeddb.ts`)

**Schema:**

```typescript
const DB_NAME = 'synckit'
const STORE_NAME = 'operations'
const DB_VERSION = 1

interface Schema {
  stores: {
    operations: {
      key: string  // operation.id
      value: Operation
      indexes: {
        status: string
        priority: string
        createdAt: number
        resource: string
        batchId: string | null
      }
    }
  }
}
```

**Implementation:**

```typescript
class IndexedDBStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null
  private dbName: string
  private storeName: string

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store
        const store = db.createObjectStore(this.storeName, {
          keyPath: 'id'
        })

        // Create indexes
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('priority', 'priority', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('resource', 'resource', { unique: false })
        store.createIndex('batchId', 'batchId', { unique: false })
      }
    })
  }

  async getAll(): Promise<Operation[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async setAll(operations: Operation[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)

      // Clear existing
      store.clear()

      // Add all operations
      operations.forEach(op => store.put(op))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async set(key: string, value: Operation): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
```

**Error Handling:**

```typescript
async init(): Promise<void> {
  try {
    // Try IndexedDB
    return await this.openDatabase()
  } catch (error) {
    // Safari private mode throws SecurityError
    if (error.name === 'SecurityError') {
      throw new Error('IndexedDB not available (private browsing?)')
    }
    throw error
  }
}
```

**Why this design?**
- Promise-based for consistency
- Transactions for data integrity
- Indexes for efficient queries
- Proper cleanup in close()
- Handle Safari private mode

### 4. Retry Engine (`src/plugins/core/retry-engine.ts`)

**Implementation:**

```typescript
class RetryEnginePlugin implements Plugin {
  name = 'retry-engine'
  version = '1.0.0'
  type = 'core' as const

  private retryTimers: Map<string, number> = new Map()
  private retryAttempts: Map<string, number> = new Map()

  hooks = {
    afterSync: (operation: Operation, result: SyncResult) => {
      if (!result.success && this.shouldRetry(operation, result.error!)) {
        this.scheduleRetry(operation)
      }
    }
  }

  private shouldRetry(operation: Operation, error: Error): boolean {
    const attempts = operation.attempts
    const maxAttempts = this.options.maxAttempts

    if (attempts >= maxAttempts) {
      return false
    }

    // Custom retry condition
    if (this.options.retryOn) {
      return this.options.retryOn(error)
    }

    // Default: retry on network errors, not on 4xx client errors
    if (error.message.includes('4')) {
      return false  // 400-499 = client error, don't retry
    }

    return true
  }

  private scheduleRetry(operation: Operation): void {
    const attempt = operation.attempts + 1
    const delay = this.calculateDelay(attempt)

    const timer = window.setTimeout(() => {
      this.retryTimers.delete(operation.id)
      this.kernel.retry(operation.id)
    }, delay)

    this.retryTimers.set(operation.id, timer)
    this.retryAttempts.set(operation.id, attempt)

    this.kernel.emit({
      type: 'retry',
      timestamp: Date.now(),
      operation,
      attempt,
      nextRetryAt: Date.now() + delay
    })
  }

  private calculateDelay(attempt: number): number {
    const { backoff, baseDelay, maxDelay, jitter, jitterFactor } = this.options

    let delay: number

    if (typeof backoff === 'function') {
      delay = backoff(attempt, baseDelay)
    } else if (backoff === 'exponential') {
      delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    } else if (backoff === 'linear') {
      delay = Math.min(baseDelay * attempt, maxDelay)
    } else if (backoff === 'fibonacci') {
      delay = Math.min(this.fibonacci(attempt) * baseDelay, maxDelay)
    } else {
      delay = baseDelay
    }

    // Add jitter to prevent thundering herd
    if (jitter) {
      const jitterAmount = delay * jitterFactor!
      const randomJitter = (Math.random() * 2 - 1) * jitterAmount
      delay = Math.max(0, delay + randomJitter)
    }

    return delay
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1
    let a = 1, b = 1
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b]
    }
    return b
  }

  cancelRetry(operationId: string): void {
    const timer = this.retryTimers.get(operationId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(operationId)
      this.retryAttempts.delete(operationId)
    }
  }

  uninstall(): void {
    // Cancel all pending retries
    this.retryTimers.forEach(timer => clearTimeout(timer))
    this.retryTimers.clear()
    this.retryAttempts.clear()
  }
}
```

**Backoff Calculations:**

```
Exponential (base=1000ms, max=30000ms):
  Attempt 1: 1000ms
  Attempt 2: 2000ms
  Attempt 3: 4000ms
  Attempt 4: 8000ms
  Attempt 5: 16000ms
  Attempt 6: 30000ms (capped)

Linear (base=1000ms):
  Attempt 1: 1000ms
  Attempt 2: 2000ms
  Attempt 3: 3000ms
  Attempt 4: 4000ms
  Attempt 5: 5000ms

Fibonacci (base=1000ms):
  Attempt 1: 1000ms (1 * base)
  Attempt 2: 1000ms (1 * base)
  Attempt 3: 2000ms (2 * base)
  Attempt 4: 3000ms (3 * base)
  Attempt 5: 5000ms (5 * base)
  Attempt 6: 8000ms (8 * base)
```

**Why this design?**
- setTimeout is non-blocking
- Jitter prevents thundering herd
- Cleanup prevents memory leaks
- Custom retry logic via options

### 5. Conflict Resolver (`src/plugins/core/conflict-resolver.ts`)

**Implementation:**

```typescript
class ConflictResolverPlugin implements Plugin {
  name = 'conflict-resolver'
  version = '1.0.0'
  type = 'core' as const

  detect(operation: Operation, response: any): boolean {
    // 1. Check HTTP status
    if (response?.status === 409) {
      return true
    }

    // 2. Check for version mismatch
    if (response?.version && operation.metadata?.version) {
      if (response.version !== operation.metadata.version) {
        return true
      }
    }

    // 3. Check ETag
    if (response?.etag && operation.metadata?.etag) {
      if (response.etag !== operation.metadata.etag) {
        return true
      }
    }

    // 4. Custom detection
    if (this.options.detectConflict) {
      return this.options.detectConflict(operation, response)
    }

    return false
  }

  async resolve(conflict: ConflictData): Promise<ConflictResolution> {
    const strategy = this.options.strategy

    switch (strategy) {
      case 'last-write-wins':
        return conflict.localTimestamp > conflict.serverTimestamp
          ? 'client'
          : 'server'

      case 'server-wins':
        return 'server'

      case 'client-wins':
        return 'client'

      case 'manual':
        // Emit event and wait for user resolution
        return await this.waitForManualResolution(conflict)

      case 'custom':
        if (this.options.customResolver) {
          return await this.options.customResolver(conflict)
        }
        throw new Error('Custom resolver not provided')

      default:
        return 'server'  // Safe default
    }
  }

  private async waitForManualResolution(
    conflict: ConflictData
  ): Promise<ConflictResolution> {
    return new Promise((resolve) => {
      // Emit conflict event
      this.kernel.emit({
        type: 'conflict',
        timestamp: Date.now(),
        operation: conflict.operation,
        serverData: conflict.serverData,
        localData: conflict.localData,
        resolution: null
      })

      // UI should call resolveConflict() when user decides
      this.pendingResolutions.set(conflict.operation.id, resolve)
    })
  }

  // Called by UI or manual intervention
  resolveConflict(operationId: string, resolution: ConflictResolution): void {
    const resolve = this.pendingResolutions.get(operationId)
    if (resolve) {
      resolve(resolution)
      this.pendingResolutions.delete(operationId)
    }
  }
}
```

**Why this design?**
- Multiple detection strategies
- Built-in resolution strategies
- Manual resolution for complex cases
- Custom resolver for app-specific logic

## Utilities Implementation

### 1. Unique ID Generator (`src/utils/uid.ts`)

```typescript
export function generateId(prefix: string = 'op'): string {
  // Timestamp (base36) + Random (base36)
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `${prefix}_${timestamp}_${random}`
}
```

**Why this design?**
- Collision-resistant (timestamp + random)
- Sortable (timestamp-based)
- Human-readable prefix
- No dependencies (no UUID library)

### 2. Priority Queue (`src/utils/priority-queue.ts`)

```typescript
export class PriorityQueue<T> {
  private heaps: Map<string, T[]>
  private priorities: string[]

  constructor(priorities: string[]) {
    this.priorities = priorities
    this.heaps = new Map()
    priorities.forEach(p => this.heaps.set(p, []))
  }

  enqueue(item: T, priority: string): void {
    const heap = this.heaps.get(priority)!
    heap.push(item)
    this.bubbleUp(heap, heap.length - 1)
  }

  dequeue(): T | undefined {
    // Check heaps in priority order
    for (const priority of this.priorities) {
      const heap = this.heaps.get(priority)!
      if (heap.length > 0) {
        return this.extractMin(heap)
      }
    }
    return undefined
  }

  private bubbleUp(heap: T[], index: number): void {
    // Min-heap property (by createdAt timestamp)
    // Implementation omitted for brevity
  }

  private extractMin(heap: T[]): T {
    // Remove root, move last to root, bubble down
    // Implementation omitted for brevity
  }
}
```

### 3. Deep Clone (`src/utils/deep-clone.ts`)

```typescript
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any
  }

  if (obj instanceof Map) {
    const map = new Map()
    obj.forEach((value, key) => {
      map.set(key, deepClone(value))
    })
    return map as any
  }

  if (obj instanceof Set) {
    const set = new Set()
    obj.forEach(value => {
      set.add(deepClone(value))
    })
    return set as any
  }

  const cloned: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone((obj as any)[key])
    }
  }
  return cloned
}
```

**Why not JSON.parse(JSON.stringify())?**
- Loses Date objects
- Loses undefined values
- Loses functions (though we don't need them)
- Performance issues with large objects

### 4. LZ-String Compression (`src/utils/compress.ts`)

**Algorithm:** LZ77-based compression

```typescript
export function compress(input: string): string {
  // 1. Build dictionary of repeated patterns
  // 2. Replace patterns with shorter references
  // 3. Encode with base64 or UTF-16
  // Implementation: ~200 lines
}

export function decompress(input: string): string {
  // Reverse of compress
  // Implementation: ~100 lines
}
```

**Why LZ-String?**
- Good compression ratio (40-60% for typical JSON)
- Fast (pure JS implementation)
- No dependencies
- Well-tested algorithm

### 5. AES-GCM Encryption (`src/utils/crypto.ts`)

```typescript
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv)
  }
}

export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToArrayBuffer(iv)
    },
    key,
    base64ToArrayBuffer(ciphertext)
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
```

**Why AES-GCM?**
- Authenticated encryption (prevents tampering)
- Built into Web Crypto API
- Industry standard
- Fast hardware acceleration

## Framework Adapters

### React Adapter (`src/adapters/react/`)

**Architecture:**

```
SyncKitProvider (creates instance, provides context)
  └─> SyncKitContext (holds instance + reactive state)
      └─> useSync() (consume context, return API)
      └─> useSyncStatus() (consume context, subscribe to status)
      └─> useSyncQueue() (consume context, subscribe to queue)
      └─> useOnline() (consume context, subscribe to online)
```

**Implementation:**

```typescript
// Context
const SyncKitContext = createContext<SyncKitContextValue | null>(null)

interface SyncKitContextValue {
  instance: SyncKit
  status: QueueStatus
  queue: Operation[]
  isOnline: boolean
}

// Provider
export function SyncKitProvider({ config, plugins, children }) {
  const instanceRef = useRef<SyncKit | null>(null)
  const [status, setStatus] = useState<QueueStatus>(/* initial */)
  const [queue, setQueue] = useState<Operation[]>([])
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Create instance
    const instance = createSyncKit(config)
    if (plugins) {
      plugins.forEach(p => instance.register(p))
    }

    // Subscribe to events
    instance.on('status-change', (e) => setStatus(e.status))
    instance.on('queue-change', (e) => setQueue(e.queue))
    instance.on('online', () => setIsOnline(true))
    instance.on('offline', () => setIsOnline(false))

    // Initialize
    instance.init()

    instanceRef.current = instance

    return () => {
      instance.destroy()
    }
  }, [])

  const value = {
    instance: instanceRef.current!,
    status,
    queue,
    isOnline
  }

  return (
    <SyncKitContext.Provider value={value}>
      {children}
    </SyncKitContext.Provider>
  )
}

// Hook
export function useSync() {
  const context = useContext(SyncKitContext)
  if (!context) {
    throw new Error('useSync must be used within SyncKitProvider')
  }

  const { instance, isOnline } = context

  return {
    push: instance.push.bind(instance),
    remove: instance.remove.bind(instance),
    retry: instance.retry.bind(instance),
    retryAll: instance.retryAll.bind(instance),
    pause: instance.pause.bind(instance),
    resume: instance.resume.bind(instance),
    clear: instance.clear.bind(instance),
    sync: instance.sync.bind(instance),
    batch: instance.batch.bind(instance),
    isOnline,
    isPaused: instance.isPaused()
  }
}

export function useSyncStatus() {
  const context = useContext(SyncKitContext)
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncKitProvider')
  }
  return context.status
}
```

**Why this design?**
- Single context for all state
- Automatic subscription to events
- Proper cleanup on unmount
- Type-safe hooks

### Vue Adapter (`src/adapters/vue/`)

**Architecture:**

```typescript
// Plugin
export function createSyncKit(config: SyncKitConfig) {
  return {
    install(app: App) {
      const instance = createSyncKitInstance(config)

      // Provide instance
      app.provide(SyncKitSymbol, instance)

      // Global properties (optional)
      app.config.globalProperties.$synckit = instance

      // Initialize
      instance.init()
    }
  }
}

// Composable
export function useSync() {
  const instance = inject(SyncKitSymbol)
  if (!instance) {
    throw new Error('SyncKit not installed')
  }

  const status = ref<QueueStatus>(instance.getStatus())
  const queue = ref<Operation[]>(instance.getQueue())
  const isOnline = ref(instance.isOnline())

  // Subscribe to events
  onMounted(() => {
    instance.on('status-change', (e) => {
      status.value = e.status
    })
    instance.on('queue-change', (e) => {
      queue.value = e.queue
    })
    instance.on('online', () => {
      isOnline.value = true
    })
    instance.on('offline', () => {
      isOnline.value = false
    })
  })

  return {
    push: instance.push.bind(instance),
    remove: instance.remove.bind(instance),
    // ... other methods
    status: readonly(status),
    queue: readonly(queue),
    isOnline: readonly(isOnline)
  }
}
```

### Svelte Adapter (`src/adapters/svelte/`)

**Architecture:**

```typescript
// Store
import { writable, derived } from 'svelte/store'

let instance: SyncKit | null = null

export function createSyncStore(config: SyncKitConfig) {
  instance = createSyncKitInstance(config)

  const statusStore = writable<QueueStatus>(instance.getStatus())
  const queueStore = writable<Operation[]>(instance.getQueue())
  const onlineStore = writable<boolean>(instance.isOnline())

  // Subscribe to events
  instance.on('status-change', (e) => statusStore.set(e.status))
  instance.on('queue-change', (e) => queueStore.set(e.queue))
  instance.on('online', () => onlineStore.set(true))
  instance.on('offline', () => onlineStore.set(false))

  // Initialize
  instance.init()

  return {
    status: { subscribe: statusStore.subscribe },
    queue: { subscribe: queueStore.subscribe },
    online: { subscribe: onlineStore.subscribe }
  }
}

export const syncStore = {
  subscribe: writable({
    isOnline: true,
    isPaused: false
  }).subscribe,

  push: (operation: OperationInput) => {
    if (!instance) throw new Error('SyncKit not initialized')
    return instance.push(operation)
  },

  // ... other methods
}
```

## Testing Strategy

### Unit Tests

**Test Coverage:**
- All public methods
- All edge cases
- All error conditions
- All hooks execution
- All event emissions

**Mocking:**

```typescript
// Mock IndexedDB
class MockIndexedDB {
  private stores: Map<string, Map<string, any>> = new Map()

  open(name: string, version: number) {
    // Return mock IDBRequest
  }
}

global.indexedDB = new MockIndexedDB() as any

// Mock fetch for executor
global.fetch = vi.fn((url, options) => {
  // Return mock response
})

// Mock network status
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})
```

### Integration Tests

**Scenarios:**

1. **Offline → Online Sync**
   - Queue operations while offline
   - Go online
   - Verify all operations sync

2. **Conflict Resolution**
   - Create conflicting operation
   - Trigger sync
   - Verify resolution strategy applied

3. **Retry with Backoff**
   - Queue operation
   - Make executor fail
   - Verify retry schedule
   - Verify backoff delays

4. **Persistence**
   - Queue operations
   - Destroy instance
   - Create new instance
   - Verify queue restored

5. **Cross-Tab Sync**
   - Open two instances (same storage)
   - Queue in one tab
   - Verify other tab sees changes

### E2E Tests

**Tools:**
- Playwright for real browser
- Real IndexedDB
- Network throttling

**Scenarios:**
- Complete user flows
- Offline mode simulation
- Service Worker integration

## Build Configuration

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "jsx": "react"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Build Tool (`tsup.config.ts`)

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'plugins/index': 'src/plugins/index.ts',
    'sw/index': 'src/sw/index.ts',
    'react/index': 'src/adapters/react/index.ts',
    'vue/index': 'src/adapters/vue/index.ts',
    'svelte/index': 'src/adapters/svelte/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  minify: true
})
```

### Testing (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts'
      ],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100
    }
  }
})
```

## Performance Optimizations

### 1. Lazy Plugin Loading

```typescript
// Only load optional plugins when registered
const plugins = {
  get batching() {
    return import('./plugins/optional/batching')
  },
  get compression() {
    return import('./plugins/optional/compression')
  }
}
```

### 2. Batch Storage Writes

```typescript
// Instead of writing on every push, batch writes
private pendingWrites: Operation[] = []
private writeTimer: number | null = null

push(operation: OperationInput): PushResult {
  // ... add to queue
  this.pendingWrites.push(operation)

  if (!this.writeTimer) {
    this.writeTimer = setTimeout(() => {
      this.flushWrites()
    }, 100)  // Batch writes every 100ms
  }
}

private async flushWrites(): Promise<void> {
  const toWrite = [...this.pendingWrites]
  this.pendingWrites = []
  this.writeTimer = null
  await this.storage.setAll(toWrite)
}
```

### 3. Debounce Events

```typescript
// Prevent event spam
private queueChangeDebounce: number | null = null

private emitQueueChange(): void {
  if (this.queueChangeDebounce) {
    clearTimeout(this.queueChangeDebounce)
  }

  this.queueChangeDebounce = setTimeout(() => {
    this.emit({
      type: 'queue-change',
      queue: this.getQueue(),
      // ...
    })
  }, 50)
}
```

## Security Best Practices

1. **Never store sensitive data unencrypted**
   - Use encryption plugin for PII
   - Clear queue on logout

2. **Validate storage data**
   - Schema validation on load
   - Corrupted data recovery

3. **Sanitize user input**
   - Validate operation payloads
   - Prevent XSS in sync-ui

4. **Handle quota exceeded**
   ```typescript
   try {
     await storage.set(key, value)
   } catch (error) {
     if (error.name === 'QuotaExceededError') {
       // Clear old operations
       await this.clearOldOperations()
     }
   }
   ```

## Migration Strategy

**V1 → V2 (future):**

```typescript
const STORAGE_VERSION = 1

async function migrateStorage(oldVersion: number, newVersion: number) {
  if (oldVersion === 1 && newVersion === 2) {
    // Migration logic
  }
}
```

## Documentation Standards

**JSDoc for all public APIs:**

```typescript
/**
 * Add an operation to the sync queue.
 *
 * @param operation - The operation to queue
 * @returns Result with operation ID and rollback function
 *
 * @example
 * ```ts
 * const { operationId, rollback } = sync.push({
 *   resource: 'posts',
 *   method: 'POST',
 *   payload: { title: 'Hello' }
 * })
 * ```
 */
push(operation: OperationInput<TPayload>): PushResult
```

---

**Implementation is ready to begin. Proceed to TASKS.md for ordered task list.**
