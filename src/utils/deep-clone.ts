/**
 * Deep clone an object, handling Date, Map, Set, and Arrays.
 * Does not handle circular references.
 *
 * @param obj - Object to clone
 * @returns Cloned object
 *
 * @example
 * ```ts
 * const original = { date: new Date(), map: new Map(), nested: { value: 1 } }
 * const cloned = deepClone(original)
 * cloned.nested.value = 2
 * console.log(original.nested.value) // 1 (unchanged)
 * ```
 */
export function deepClone<T>(obj: T): T {
  // Primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  // Array
  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T
  }

  // Map
  if (obj instanceof Map) {
    const map = new Map()
    obj.forEach((value, key) => {
      map.set(key, deepClone(value))
    })
    return map as T
  }

  // Set
  if (obj instanceof Set) {
    const set = new Set()
    obj.forEach((value) => {
      set.add(deepClone(value))
    })
    return set as T
  }

  // Plain object
  const cloned: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as any)[key])
    }
  }
  return cloned
}

/**
 * Check if two values are deeply equal.
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if deeply equal
 *
 * @example
 * ```ts
 * deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }) // true
 * deepEqual({ a: 1 }, { a: 2 }) // false
 * ```
 */
export function deepEqual(a: any, b: any): boolean {
  // Same reference
  if (a === b) {
    return true
  }

  // Both null or undefined
  if (a == null || b == null) {
    return a === b
  }

  // Different types
  if (typeof a !== typeof b) {
    return false
  }

  // Not objects
  if (typeof a !== 'object') {
    return a === b
  }

  // Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Array
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  // Map
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) {
      return false
    }
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key))) {
        return false
      }
    }
    return true
  }

  // Set
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) {
      return false
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false
      }
    }
    return true
  }

  // Plain object
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) {
    return false
  }

  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]))
}
