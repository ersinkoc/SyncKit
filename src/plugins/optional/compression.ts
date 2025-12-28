import type { Plugin, SyncKit, Operation } from '../../types'

/**
 * Compression options.
 */
export interface CompressionOptions {
  /**
   * Compression algorithm to use.
   * @default 'gzip'
   */
  algorithm?: 'gzip' | 'deflate'

  /**
   * Minimum payload size to compress (bytes).
   * Payloads smaller than this will not be compressed.
   * @default 1024 (1KB)
   */
  threshold?: number

  /**
   * Compress operations in storage.
   * @default true
   */
  compressStorage?: boolean

  /**
   * Compress operations before network transmission.
   * Note: User's executor must handle compressed payloads.
   * @default false
   */
  compressNetwork?: boolean
}

/**
 * Compression API exposed to users.
 */
export interface CompressionAPI {
  /**
   * Manually compress a payload.
   */
  compress(payload: unknown): Promise<Uint8Array>

  /**
   * Manually decompress a payload.
   */
  decompress(compressed: Uint8Array): Promise<unknown>
}

/**
 * Compression Plugin - compresses operation payloads.
 * Optional plugin (user must register manually).
 * Uses browser's built-in CompressionStream API.
 */
export class CompressionPlugin implements Plugin {
  name = 'compression'
  version = '1.0.0'
  type = 'optional' as const

  private options: Required<CompressionOptions>
  private compressedOperations: Set<string> = new Set()
  api!: CompressionAPI

  constructor(options: CompressionOptions = {}) {
    this.options = {
      algorithm: options.algorithm || 'gzip',
      threshold: options.threshold || 1024,
      compressStorage: options.compressStorage ?? true,
      compressNetwork: options.compressNetwork ?? false,
    }
  }

  install(_kernel: SyncKit): void {
    // Check if CompressionStream is available
    if (typeof CompressionStream === 'undefined') {
      console.warn('CompressionStream API not available. Compression plugin disabled.')
    }

    // Expose API
    this.api = {
      compress: this.compress.bind(this),
      decompress: this.decompress.bind(this),
    }
  }

  async uninstall(): Promise<void> {
    this.compressedOperations.clear()
  }

  /**
   * Plugin hooks.
   */
  hooks = {
    /**
     * Before adding to queue - compress if needed.
     */
    beforeQueue: async (operation: Operation): Promise<void> => {
      if (!this.shouldCompress(operation.payload)) {
        return
      }

      if (this.options.compressStorage) {
        try {
          const compressed = await this.compress(operation.payload)
          // Store compressed payload as base64 string
          ;(operation as any).payload = {
            __compressed: true,
            data: this.arrayBufferToBase64(compressed),
          }
          this.compressedOperations.add(operation.id)
        } catch (error) {
          console.error('Compression failed:', error)
        }
      }
    },

    /**
     * Before sync - compress for network if enabled.
     */
    beforeSync: async (operation: Operation): Promise<boolean> => {
      if (!this.options.compressNetwork || this.compressedOperations.has(operation.id)) {
        return true
      }

      if (this.shouldCompress(operation.payload)) {
        try {
          const compressed = await this.compress(operation.payload)
          ;(operation as any).payload = {
            __compressed: true,
            data: this.arrayBufferToBase64(compressed),
          }
          this.compressedOperations.add(operation.id)
        } catch (error) {
          console.error('Compression failed:', error)
        }
      }

      return true
    },

    /**
     * After sync - decompress if needed.
     */
    afterSync: async (operation: Operation): Promise<void> => {
      if (!this.compressedOperations.has(operation.id)) {
        return
      }

      try {
        const payload = operation.payload as any
        if (payload?.__compressed) {
          const compressed = this.base64ToArrayBuffer(payload.data)
          const decompressed = await this.decompress(compressed)
          ;(operation as any).payload = decompressed
          this.compressedOperations.delete(operation.id)
        }
      } catch (error) {
        console.error('Decompression failed:', error)
      }
    },
  }

  /**
   * Check if payload should be compressed.
   * @private
   */
  private shouldCompress(payload: unknown): boolean {
    if (typeof CompressionStream === 'undefined') {
      return false
    }

    // Estimate payload size
    const size = new Blob([JSON.stringify(payload)]).size
    return size >= this.options.threshold
  }

  /**
   * Compress payload using CompressionStream.
   * @private
   */
  private async compress(payload: unknown): Promise<Uint8Array> {
    if (typeof CompressionStream === 'undefined') {
      throw new Error('CompressionStream not available')
    }

    // Serialize payload
    const json = JSON.stringify(payload)
    const stream = new Blob([json]).stream()

    // Compress
    const compressedStream = stream.pipeThrough(
      new CompressionStream(this.options.algorithm)
    )

    // Read compressed data
    const chunks: Uint8Array[] = []
    const reader = compressedStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + (chunk?.length || 0), 0)
    const result = new Uint8Array(totalLength) as Uint8Array
    let offset = 0

    for (const chunk of chunks) {
      if (chunk) {
        result.set(chunk, offset)
        offset += chunk.length
      }
    }

    return result
  }

  /**
   * Decompress payload using DecompressionStream.
   * @private
   */
  private async decompress(compressed: Uint8Array): Promise<unknown> {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not available')
    }

    // Create stream from compressed data
    const stream = new Blob([new Uint8Array(compressed)]).stream()

    // Decompress
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream(this.options.algorithm)
    )

    // Read decompressed data
    const chunks: Uint8Array[] = []
    const reader = decompressedStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + (chunk?.length || 0), 0)
    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      if (chunk) {
        result.set(chunk, offset)
        offset += chunk.length
      }
    }

    // Decode and parse JSON
    const json = new TextDecoder().decode(result)
    return JSON.parse(json)
  }

  /**
   * Convert ArrayBuffer to base64 string.
   * @private
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength

    for (let i = 0; i < len; i++) {
      const byte = bytes[i]
      if (byte !== undefined) {
        binary += String.fromCharCode(byte)
      }
    }

    return btoa(binary)
  }

  /**
   * Convert base64 string to ArrayBuffer.
   * @private
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)

    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    return bytes
  }
}

/**
 * Create compression plugin instance.
 */
export function compressionPlugin(options?: CompressionOptions): CompressionPlugin {
  return new CompressionPlugin(options)
}
