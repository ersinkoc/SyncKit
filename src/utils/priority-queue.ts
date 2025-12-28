import type { Priority } from '../types'

/**
 * Item in the priority queue with timestamp for FIFO within same priority.
 */
interface QueueItem<T> {
  value: T
  timestamp: number
}

/**
 * Priority queue implementation with separate heaps for each priority level.
 * Within the same priority, items are processed FIFO (by timestamp).
 *
 * Time complexity:
 * - enqueue: O(log n)
 * - dequeue: O(log n)
 * - peek: O(1)
 *
 * @template T - Type of items in the queue
 */
export class PriorityQueue<T> {
  private heaps: Map<Priority, QueueItem<T>[]>
  private readonly priorities: Priority[] = ['critical', 'high', 'normal', 'low']
  private _size: number = 0

  constructor() {
    this.heaps = new Map()
    this.priorities.forEach((priority) => {
      this.heaps.set(priority, [])
    })
  }

  /**
   * Add an item to the queue.
   * @param item - Item to add
   * @param priority - Priority level
   */
  enqueue(item: T, priority: Priority): void {
    const heap = this.heaps.get(priority)!
    const queueItem: QueueItem<T> = {
      value: item,
      timestamp: Date.now(),
    }

    heap.push(queueItem)
    this.bubbleUp(heap, heap.length - 1)
    this._size++
  }

  /**
   * Remove and return the highest priority item.
   * Within same priority, returns oldest item (FIFO).
   * @returns Item or undefined if queue is empty
   */
  dequeue(): T | undefined {
    // Check heaps in priority order
    for (const priority of this.priorities) {
      const heap = this.heaps.get(priority)!
      if (heap.length > 0) {
        const item = this.extractMin(heap)
        this._size--
        return item
      }
    }
    return undefined
  }

  /**
   * Get the highest priority item without removing it.
   * @returns Item or undefined if queue is empty
   */
  peek(): T | undefined {
    for (const priority of this.priorities) {
      const heap = this.heaps.get(priority)!
      if (heap.length > 0) {
        return heap[0]!.value
      }
    }
    return undefined
  }

  /**
   * Remove a specific item from the queue.
   * O(n) operation as we need to find the item first.
   * @param predicate - Function to find the item
   * @returns true if item was found and removed
   */
  remove(predicate: (item: T) => boolean): boolean {
    for (const priority of this.priorities) {
      const heap = this.heaps.get(priority)!
      const index = heap.findIndex((qi) => predicate(qi.value))

      if (index !== -1) {
        // Replace with last item and re-heapify
        const last = heap.pop()!
        if (index < heap.length) {
          heap[index] = last
          // Try bubble up first, then bubble down
          const parentIndex = Math.floor((index - 1) / 2)
          if (index > 0 && this.compare(heap[index]!, heap[parentIndex]!) < 0) {
            this.bubbleUp(heap, index)
          } else {
            this.bubbleDown(heap, index)
          }
        }
        this._size--
        return true
      }
    }
    return false
  }

  /**
   * Get all items in the queue (unordered).
   * @returns Array of all items
   */
  toArray(): T[] {
    const result: T[] = []
    for (const priority of this.priorities) {
      const heap = this.heaps.get(priority)!
      result.push(...heap.map((qi) => qi.value))
    }
    return result
  }

  /**
   * Clear the queue.
   */
  clear(): void {
    this.priorities.forEach((priority) => {
      this.heaps.set(priority, [])
    })
    this._size = 0
  }

  /**
   * Get the number of items in the queue.
   */
  get size(): number {
    return this._size
  }

  /**
   * Check if queue is empty.
   */
  get isEmpty(): boolean {
    return this._size === 0
  }

  /**
   * Compare two queue items (min-heap: smaller timestamp = higher priority).
   * @private
   */
  private compare(a: QueueItem<T>, b: QueueItem<T>): number {
    return a.timestamp - b.timestamp
  }

  /**
   * Bubble up an item to maintain heap property.
   * @private
   */
  private bubbleUp(heap: QueueItem<T>[], index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.compare(heap[index]!, heap[parentIndex]!) >= 0) {
        break
      }
      // Swap with parent
      ;[heap[index], heap[parentIndex]] = [heap[parentIndex]!, heap[index]!]
      index = parentIndex
    }
  }

  /**
   * Bubble down an item to maintain heap property.
   * @private
   */
  private bubbleDown(heap: QueueItem<T>[], index: number): void {
    const length = heap.length

    while (true) {
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2
      let smallest = index

      if (leftChild < length && this.compare(heap[leftChild]!, heap[smallest]!) < 0) {
        smallest = leftChild
      }

      if (rightChild < length && this.compare(heap[rightChild]!, heap[smallest]!) < 0) {
        smallest = rightChild
      }

      if (smallest === index) {
        break
      }

      // Swap with smallest child
      ;[heap[index], heap[smallest]] = [heap[smallest]!, heap[index]!]
      index = smallest
    }
  }

  /**
   * Extract the minimum item from a heap.
   * @private
   */
  private extractMin(heap: QueueItem<T>[]): T {
    const min = heap[0]!.value

    const last = heap.pop()!
    if (heap.length > 0) {
      heap[0] = last
      this.bubbleDown(heap, 0)
    }

    return min
  }
}
