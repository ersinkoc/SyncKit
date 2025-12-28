import type { Plugin, SyncKit, Operation, OperationStatus, Priority } from '../../types'
import { PriorityQueue } from '../../utils/priority-queue'

/**
 * Queue Manager API exposed to users.
 */
export interface QueueManagerAPI {
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

/**
 * Queue Manager Plugin - manages the operation queue with priority support.
 * Core plugin (always loaded).
 */
export class QueueManagerPlugin implements Plugin {
  name = 'queue-manager'
  version = '1.0.0'
  type = 'core' as const

  private queue: PriorityQueue<Operation>
  private operationsMap: Map<string, Operation>
  private kernel?: SyncKit
  api!: QueueManagerAPI

  constructor() {
    this.queue = new PriorityQueue<Operation>()
    this.operationsMap = new Map()
  }

  install(kernel: SyncKit): void {
    this.kernel = kernel

    // Expose API
    this.api = {
      enqueue: this.enqueue.bind(this),
      dequeue: this.dequeue.bind(this),
      peek: this.peek.bind(this),
      remove: this.remove.bind(this),
      update: this.update.bind(this),
      clear: this.clear.bind(this),
      getAll: this.getAll.bind(this),
      getByStatus: this.getByStatus.bind(this),
      getByPriority: this.getByPriority.bind(this),
      getByResource: this.getByResource.bind(this),
      getBatch: this.getBatch.bind(this),
      find: this.find.bind(this),
      count: this.count.bind(this),
      countByStatus: this.countByStatus.bind(this),
    }
  }

  uninstall(): void {
    this.queue.clear()
    this.operationsMap.clear()
  }

  /**
   * Add operation to queue.
   */
  private enqueue(operation: Operation): void {
    this.queue.enqueue(operation, operation.priority)
    this.operationsMap.set(operation.id, operation)
    this.emitQueueChange()
  }

  /**
   * Remove and return highest priority operation.
   */
  private dequeue(): Operation | undefined {
    const op = this.queue.dequeue()
    if (op) {
      this.operationsMap.delete(op.id)
      this.emitQueueChange()
    }
    return op
  }

  /**
   * Get highest priority operation without removing.
   */
  private peek(): Operation | undefined {
    return this.queue.peek()
  }

  /**
   * Remove operation by ID.
   */
  private remove(id: string): boolean {
    const op = this.operationsMap.get(id)
    if (!op) {
      return false
    }

    const removed = this.queue.remove((item) => item.id === id)
    if (removed) {
      this.operationsMap.delete(id)
      this.emitQueueChange()
    }
    return removed
  }

  /**
   * Update operation.
   */
  private update(id: string, updates: Partial<Operation>): boolean {
    const op = this.operationsMap.get(id)
    if (!op) {
      return false
    }

    // Update operation
    Object.assign(op, updates)
    op.updatedAt = Date.now()

    this.emitQueueChange()
    return true
  }

  /**
   * Clear all operations.
   */
  private clear(): void {
    this.queue.clear()
    this.operationsMap.clear()
    this.emitQueueChange()
  }

  /**
   * Get all operations.
   */
  private getAll(): Operation[] {
    return Array.from(this.operationsMap.values())
  }

  /**
   * Get operations by status.
   */
  private getByStatus(status: OperationStatus): Operation[] {
    return this.getAll().filter((op) => op.status === status)
  }

  /**
   * Get operations by priority.
   */
  private getByPriority(priority: Priority): Operation[] {
    return this.getAll().filter((op) => op.priority === priority)
  }

  /**
   * Get operations by resource.
   */
  private getByResource(resource: string): Operation[] {
    return this.getAll().filter((op) => op.resource === resource)
  }

  /**
   * Get operations by batch ID.
   */
  private getBatch(batchId: string): Operation[] {
    return this.getAll().filter((op) => op.batchId === batchId)
  }

  /**
   * Find operations matching predicate.
   */
  private find(predicate: (op: Operation) => boolean): Operation[] {
    return this.getAll().filter(predicate)
  }

  /**
   * Get total count.
   */
  private count(): number {
    return this.operationsMap.size
  }

  /**
   * Count operations by status.
   */
  private countByStatus(): Record<OperationStatus, number> {
    const counts: Record<string, number> = {
      pending: 0,
      syncing: 0,
      success: 0,
      failed: 0,
      conflict: 0,
      cancelled: 0,
    }

    for (const op of this.operationsMap.values()) {
      counts[op.status] = (counts[op.status] || 0) + 1
    }

    return counts as Record<OperationStatus, number>
  }

  /**
   * Emit queue change event.
   * @private
   */
  private emitQueueChange(): void {
    if (this.kernel) {
      this.kernel.emit({
        type: 'queue-change',
        timestamp: Date.now(),
        queue: this.getAll(),
        added: [], // TODO: track changes
        removed: [],
        updated: [],
      })
    }
  }
}

/**
 * Create queue manager plugin instance.
 */
export function queueManager(): QueueManagerPlugin {
  return new QueueManagerPlugin()
}
