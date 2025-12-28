/**
 * Priority levels for operations in the queue.
 * Higher priority operations are processed first.
 */
export type Priority = 'critical' | 'high' | 'normal' | 'low'

/**
 * Operation status in the sync lifecycle.
 */
export type OperationStatus =
  | 'pending' // Waiting to be synced
  | 'syncing' // Currently being synced
  | 'success' // Successfully synced
  | 'failed' // Failed after max retries
  | 'conflict' // Conflict detected
  | 'cancelled' // Manually cancelled

/**
 * Core operation data structure.
 */
export interface Operation<TPayload = unknown> {
  /** Unique operation identifier */
  id: string
  /** Resource path (e.g., 'posts', 'users/123') */
  resource: string
  /** HTTP method or custom action */
  method: string
  /** Operation payload data */
  payload: TPayload
  /** Priority level */
  priority: Priority
  /** Current status */
  status: OperationStatus
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

/**
 * Input for creating a new operation.
 */
export interface OperationInput<TPayload = unknown> {
  /** Optional custom ID (auto-generated if not provided) */
  id?: string
  /** Resource path */
  resource: string
  /** HTTP method or action */
  method: string
  /** Operation payload */
  payload: TPayload
  /** Priority level (default: 'normal') */
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

/**
 * Result of pushing an operation to the queue.
 */
export interface PushResult {
  /** Generated operation ID */
  operationId: string
  /** Optimistic update ID (if optimistic enabled) */
  optimisticId: string | null
  /** Function to rollback optimistic update */
  rollback: () => void
}

/**
 * Queue statistics.
 */
export interface QueueStatus {
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

/**
 * Result of a sync operation.
 */
export interface SyncResult<TResult = unknown> {
  /** Operation ID */
  operationId: string
  /** Whether sync was successful */
  success: boolean
  /** Result data (if successful) */
  result: TResult | null
  /** Error (if failed) */
  error: Error | null
  /** Sync duration in milliseconds */
  duration: number
  /** Number of attempts */
  attempts: number
  /** Whether conflict was detected */
  conflict: boolean
  /** Conflict resolution applied (if any) */
  conflictResolution: ConflictResolution | null
}

/**
 * Conflict resolution strategies.
 */
export type ConflictStrategy =
  | 'last-write-wins' // Compare timestamps
  | 'server-wins' // Always use server data
  | 'client-wins' // Always use client data
  | 'manual' // Wait for user decision
  | 'custom' // Use custom handler

/**
 * Conflict data provided to resolver.
 */
export interface ConflictData<TPayload = unknown, TResult = unknown> {
  /** The conflicting operation */
  operation: Operation<TPayload>
  /** Server data */
  serverData: TResult
  /** Local data */
  localData: TPayload
  /** Server timestamp */
  serverTimestamp: number
  /** Local timestamp */
  localTimestamp: number
}

/**
 * Result of conflict resolution.
 */
export type ConflictResolution<TPayload = unknown> =
  | 'server' // Use server data
  | 'client' // Use client data
  | { merged: TPayload } // Use merged data

/**
 * Custom conflict handler function.
 */
export type ConflictHandler<TPayload, TResult> = (
  conflict: ConflictData<TPayload, TResult>
) => Promise<ConflictResolution<TPayload>>

/**
 * Backoff strategy for retries.
 */
export type BackoffStrategy = 'linear' | 'exponential' | 'fibonacci'

/**
 * Custom backoff function.
 */
export type BackoffFunction = (attempt: number, baseDelay: number) => number

/**
 * Retry configuration options.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Backoff strategy or custom function */
  backoff: BackoffStrategy | BackoffFunction
  /** Base delay in milliseconds */
  baseDelay: number
  /** Maximum delay cap in milliseconds */
  maxDelay: number
  /** Enable jitter to prevent thundering herd */
  jitter?: boolean
  /** Jitter factor (0-1) */
  jitterFactor?: number
  /** Custom retry condition */
  retryOn?: (error: Error) => boolean
}

/**
 * Executor function that performs the actual sync operation.
 */
export type Executor<TPayload, TResult> = (
  operation: Operation<TPayload>
) => Promise<TResult>

/**
 * Storage adapter interface for queue persistence.
 */
export interface StorageAdapter {
  /** Initialize storage */
  init(): Promise<void>
  /** Get operation by ID */
  get(key: string): Promise<Operation | undefined>
  /** Get all operations */
  getAll(): Promise<Operation[]>
  /** Save single operation */
  set(key: string, value: Operation): Promise<void>
  /** Save all operations (replace entire queue) */
  setAll(operations: Operation[]): Promise<void>
  /** Remove operation */
  remove(key: string): Promise<void>
  /** Clear all operations */
  clear(): Promise<void>
  /** Get count of operations */
  count(): Promise<number>
  /** Close storage connection */
  close(): Promise<void>
}

/**
 * Event types emitted by the kernel.
 */
export type EventType =
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

/**
 * Base event structure.
 */
export interface BaseEvent {
  type: EventType
  timestamp: number
}

/**
 * Network online event.
 */
export interface OnlineEvent extends BaseEvent {
  type: 'online'
}

/**
 * Network offline event.
 */
export interface OfflineEvent extends BaseEvent {
  type: 'offline'
}

/**
 * Operation pushed to queue event.
 */
export interface PushEvent extends BaseEvent {
  type: 'push'
  operation: Operation
  optimistic: boolean
}

/**
 * Operation removed from queue event.
 */
export interface RemoveEvent extends BaseEvent {
  type: 'remove'
  operationId: string
}

/**
 * Queue cleared event.
 */
export interface ClearEvent extends BaseEvent {
  type: 'clear'
}

/**
 * Sync started event.
 */
export interface SyncStartEvent extends BaseEvent {
  type: 'sync-start'
  operation: Operation
}

/**
 * Sync success event.
 */
export interface SyncSuccessEvent extends BaseEvent {
  type: 'sync-success'
  operation: Operation
  result: unknown
  duration: number
}

/**
 * Sync error event.
 */
export interface SyncErrorEvent extends BaseEvent {
  type: 'sync-error'
  operation: Operation
  error: Error
  willRetry: boolean
  attempt: number
}

/**
 * Conflict detected event.
 */
export interface ConflictEvent extends BaseEvent {
  type: 'conflict'
  operation: Operation
  serverData: unknown
  localData: unknown
  resolution: ConflictResolution | null
}

/**
 * Retry scheduled event.
 */
export interface RetryEvent extends BaseEvent {
  type: 'retry'
  operation: Operation
  attempt: number
  nextRetryAt: number
}

/**
 * Queue changed event.
 */
export interface QueueChangeEvent extends BaseEvent {
  type: 'queue-change'
  queue: Operation[]
  added: Operation[]
  removed: Operation[]
  updated: Operation[]
}

/**
 * Status changed event.
 */
export interface StatusChangeEvent extends BaseEvent {
  type: 'status-change'
  status: QueueStatus
  previousStatus: QueueStatus
}

/**
 * Batch started event.
 */
export interface BatchStartEvent extends BaseEvent {
  type: 'batch-start'
  batchId: string
  operations: Operation[]
}

/**
 * Batch completed event.
 */
export interface BatchCompleteEvent extends BaseEvent {
  type: 'batch-complete'
  batchId: string
  results: SyncResult[]
  allSuccessful: boolean
}

/**
 * Queue paused event.
 */
export interface PauseEvent extends BaseEvent {
  type: 'pause'
}

/**
 * Queue resumed event.
 */
export interface ResumeEvent extends BaseEvent {
  type: 'resume'
}

/**
 * Union of all possible events.
 */
export type KernelEvent =
  | OnlineEvent
  | OfflineEvent
  | PushEvent
  | RemoveEvent
  | ClearEvent
  | SyncStartEvent
  | SyncSuccessEvent
  | SyncErrorEvent
  | ConflictEvent
  | RetryEvent
  | QueueChangeEvent
  | StatusChangeEvent
  | BatchStartEvent
  | BatchCompleteEvent
  | PauseEvent
  | ResumeEvent

/**
 * Event handler function.
 */
export type EventHandler<E extends EventType> = (
  event: Extract<KernelEvent, { type: E }>
) => void

/**
 * Unsubscribe function returned by event listeners.
 */
export type Unsubscribe = () => void

/**
 * Plugin hook functions.
 */
export interface PluginHooks {
  /** Called before operation is pushed to queue (can modify or reject) */
  beforePush?: (operation: OperationInput) => OperationInput | false | Promise<OperationInput | false>
  /** Called after operation is pushed to queue */
  afterPush?: (operation: Operation) => void | Promise<void>
  /** Called before sync (can cancel by returning false) */
  beforeSync?: (operation: Operation) => boolean | Promise<boolean>
  /** Called after sync completes (success or failure) */
  afterSync?: (operation: Operation, result: SyncResult) => void | Promise<void>
  /** Called before retry (can cancel by returning false) */
  beforeRetry?: (operation: Operation, attempt: number) => boolean | Promise<boolean>
  /** Called when conflict is detected (can provide resolution) */
  onConflict?: (conflict: ConflictData) => ConflictResolution | undefined | Promise<ConflictResolution | undefined>
  /** Called when network goes online */
  onOnline?: () => void | Promise<void>
  /** Called when network goes offline */
  onOffline?: () => void | Promise<void>
  /** Called when queue changes */
  onQueueChange?: (queue: Operation[]) => void | Promise<void>
  /** Called when status changes */
  onStatusChange?: (status: QueueStatus) => void | Promise<void>
}

/**
 * Plugin interface.
 */
export interface Plugin {
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

/**
 * Plugin information.
 */
export interface PluginInfo {
  name: string
  version: string
  type: 'core' | 'optional'
  enabled: boolean
}

/**
 * Kernel configuration options.
 */
export interface KernelOptions<TPayload = unknown, TResult = unknown> {
  /** Unique identifier for this instance (used for storage key) */
  name: string
  /** Storage adapter or built-in storage type */
  storage: 'indexeddb' | 'localstorage' | StorageAdapter
  /** Function to execute sync operations */
  executor: Executor<TPayload, TResult>
  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy
  /** Custom conflict handler (required if strategy is 'custom') */
  onConflict?: ConflictHandler<TPayload, TResult>
  /** Retry configuration */
  retry?: Partial<RetryOptions>
  /** Plugins to register */
  plugins?: Plugin[]
  /** Auto-sync when online (default: true) */
  autoSync?: boolean
  /** Polling interval for sync when online (default: 0 = disabled) */
  syncInterval?: number
}

/**
 * Main SyncKit interface (Kernel).
 */
export interface SyncKit<TPayload = unknown, TResult = unknown> {
  // ===== Queue Operations =====

  /**
   * Add an operation to the sync queue.
   * @param operation - Operation to queue
   * @returns Result with operation ID and rollback function
   */
  push(operation: OperationInput<TPayload>): PushResult

  /**
   * Remove an operation from the queue.
   * @param operationId - ID of operation to remove
   * @returns true if removed, false if not found
   */
  remove(operationId: string): boolean

  /**
   * Clear all operations from the queue.
   */
  clear(): void

  /**
   * Get all operations in the queue.
   * @returns Array of operations
   */
  getQueue(): Operation<TPayload>[]

  /**
   * Get a specific operation by ID.
   * @param id - Operation ID
   * @returns Operation or undefined if not found
   */
  getOperation(id: string): Operation<TPayload> | undefined

  // ===== Queue Status =====

  /**
   * Get queue status and statistics.
   * @returns Queue status
   */
  getStatus(): QueueStatus

  /**
   * Check if an operation is pending.
   * @param operationId - Operation ID
   * @returns true if pending
   */
  isPending(operationId: string): boolean

  // ===== Sync Control =====

  /**
   * Force sync all pending operations immediately.
   * @returns Array of sync results
   */
  sync(): Promise<SyncResult<TResult>[]>

  /**
   * Pause queue processing.
   */
  pause(): void

  /**
   * Resume queue processing.
   */
  resume(): void

  /**
   * Check if queue is paused.
   * @returns true if paused
   */
  isPaused(): boolean

  /**
   * Retry a specific failed operation.
   * @param operationId - Operation ID
   * @returns Sync result
   */
  retry(operationId: string): Promise<SyncResult<TResult>>

  /**
   * Retry all failed operations.
   * @returns Array of sync results
   */
  retryAll(): Promise<SyncResult<TResult>[]>

  // ===== Network Status =====

  /**
   * Check if device is online.
   * @returns true if online
   */
  isOnline(): boolean

  /**
   * Manually set online status (for testing).
   * @param online - Online status
   */
  setOnline(online: boolean): void

  // ===== Batch Operations =====

  /**
   * Create a batch of operations.
   * @param batchId - Batch identifier
   * @param operations - Operations to batch
   * @returns Batch ID
   */
  batch(batchId: string, operations: OperationInput<TPayload>[]): string

  // ===== Plugin Management =====

  /**
   * Register a plugin.
   * @param plugin - Plugin to register
   */
  register(plugin: Plugin): void

  /**
   * Unregister a plugin.
   * @param pluginName - Name of plugin to unregister
   */
  unregister(pluginName: string): void

  /**
   * Get a registered plugin by name.
   * @param name - Plugin name
   * @returns Plugin instance or undefined
   */
  getPlugin<P extends Plugin>(name: string): P | undefined

  /**
   * List all registered plugins.
   * @returns Array of plugin info
   */
  listPlugins(): PluginInfo[]

  // ===== Event System =====

  /**
   * Subscribe to an event.
   * @param eventType - Event type
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  on<E extends EventType>(eventType: E, handler: EventHandler<E>): Unsubscribe

  /**
   * Subscribe to all events.
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  onAny(handler: (event: KernelEvent) => void): Unsubscribe

  /**
   * Unsubscribe from an event.
   * @param eventType - Event type
   * @param handler - Event handler to remove
   */
  off<E extends EventType>(eventType: E, handler: EventHandler<E>): void

  /**
   * Emit an event (for plugins).
   * @param event - Event to emit
   */
  emit(event: KernelEvent): void

  // ===== Lifecycle =====

  /**
   * Initialize the kernel (load queue from storage).
   * Must be called before using the instance.
   */
  init(): Promise<void>

  /**
   * Destroy the kernel (cleanup resources).
   */
  destroy(): Promise<void>

  // ===== Configuration =====

  /**
   * Update configuration at runtime.
   * @param options - Partial options to update
   */
  configure(options: Partial<KernelOptions<TPayload, TResult>>): void

  /**
   * Get current configuration.
   * @returns Current options
   */
  getOptions(): KernelOptions<TPayload, TResult>
}

/**
 * SyncKit configuration (alias for KernelOptions).
 */
export type SyncKitConfig<TPayload = unknown, TResult = unknown> = KernelOptions<
  TPayload,
  TResult
>
