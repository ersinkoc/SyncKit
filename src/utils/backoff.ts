import type { BackoffFunction } from '../types'

/**
 * Exponential backoff: delay = baseDelay * 2^(attempt - 1)
 * Example: 1s, 2s, 4s, 8s, 16s, 32s (capped at maxDelay)
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @returns Delay in milliseconds
 *
 * @example
 * ```ts
 * exponentialBackoff(1, 1000, 30000) // 1000
 * exponentialBackoff(2, 1000, 30000) // 2000
 * exponentialBackoff(3, 1000, 30000) // 4000
 * exponentialBackoff(10, 1000, 30000) // 30000 (capped)
 * ```
 */
export function exponentialBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const delay = baseDelay * Math.pow(2, attempt - 1)
  return Math.min(delay, maxDelay)
}

/**
 * Linear backoff: delay = baseDelay * attempt
 * Example: 1s, 2s, 3s, 4s, 5s (capped at maxDelay)
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @returns Delay in milliseconds
 *
 * @example
 * ```ts
 * linearBackoff(1, 1000, 30000) // 1000
 * linearBackoff(2, 1000, 30000) // 2000
 * linearBackoff(3, 1000, 30000) // 3000
 * ```
 */
export function linearBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * attempt
  return Math.min(delay, maxDelay)
}

/**
 * Fibonacci backoff: delay = fibonacci(attempt) * baseDelay
 * Example: 1s, 1s, 2s, 3s, 5s, 8s, 13s (capped at maxDelay)
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @returns Delay in milliseconds
 *
 * @example
 * ```ts
 * fibonacciBackoff(1, 1000, 30000) // 1000
 * fibonacciBackoff(2, 1000, 30000) // 1000
 * fibonacciBackoff(3, 1000, 30000) // 2000
 * fibonacciBackoff(4, 1000, 30000) // 3000
 * fibonacciBackoff(5, 1000, 30000) // 5000
 * ```
 */
export function fibonacciBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const fib = fibonacci(attempt)
  const delay = fib * baseDelay
  return Math.min(delay, maxDelay)
}

/**
 * Calculate the nth Fibonacci number.
 * @param n - Position in Fibonacci sequence (1-based)
 * @returns Fibonacci number
 *
 * @example
 * ```ts
 * fibonacci(1) // 1
 * fibonacci(2) // 1
 * fibonacci(3) // 2
 * fibonacci(4) // 3
 * fibonacci(5) // 5
 * fibonacci(6) // 8
 * ```
 */
export function fibonacci(n: number): number {
  if (n <= 1) return 1

  let a = 1
  let b = 1

  for (let i = 2; i <= n; i++) {
    ;[a, b] = [b, a + b]
  }

  return b
}

/**
 * Add jitter to a delay to prevent thundering herd problem.
 * Jitter is randomness added to the delay: delay * (1 ± jitterFactor)
 *
 * @param delay - Base delay in milliseconds
 * @param jitterFactor - Jitter factor (0-1), default 0.1 (10%)
 * @returns Delay with jitter applied
 *
 * @example
 * ```ts
 * // With 10% jitter, 1000ms becomes 900-1100ms
 * addJitter(1000, 0.1) // ~950-1050ms
 * addJitter(5000, 0.2) // ~4000-6000ms
 * ```
 */
export function addJitter(delay: number, jitterFactor: number = 0.1): number {
  // Random value between -jitterFactor and +jitterFactor
  const randomFactor = (Math.random() * 2 - 1) * jitterFactor
  const jitter = delay * randomFactor
  return Math.max(0, delay + jitter)
}

/**
 * Calculate backoff delay with optional jitter.
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @param strategy - Backoff strategy or custom function
 * @param jitter - Whether to add jitter
 * @param jitterFactor - Jitter factor (0-1)
 * @returns Delay in milliseconds
 *
 * @example
 * ```ts
 * calculateBackoff(3, 1000, 30000, 'exponential', true, 0.1)
 * calculateBackoff(3, 1000, 30000, 'linear', false, 0)
 * calculateBackoff(3, 1000, 30000, (a, b) => a * b * 2, false, 0)
 * ```
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  strategy: 'linear' | 'exponential' | 'fibonacci' | BackoffFunction,
  jitter: boolean = false,
  jitterFactor: number = 0.1
): number {
  let delay: number

  if (typeof strategy === 'function') {
    delay = strategy(attempt, baseDelay)
    delay = Math.min(delay, maxDelay)
  } else {
    switch (strategy) {
      case 'exponential':
        delay = exponentialBackoff(attempt, baseDelay, maxDelay)
        break
      case 'linear':
        delay = linearBackoff(attempt, baseDelay, maxDelay)
        break
      case 'fibonacci':
        delay = fibonacciBackoff(attempt, baseDelay, maxDelay)
        break
      default:
        delay = baseDelay
    }
  }

  if (jitter) {
    delay = addJitter(delay, jitterFactor)
  }

  return delay
}
