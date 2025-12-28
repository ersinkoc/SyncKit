import type { Plugin, SyncKit, Operation } from '../../types'

/**
 * Encryption options.
 */
export interface EncryptionOptions {
  /**
   * Encryption key or passphrase.
   * If a string is provided, it will be used to derive a key.
   */
  key: string | CryptoKey

  /**
   * Salt for key derivation (required if key is a string).
   * Should be unique per application.
   */
  salt?: string

  /**
   * Encrypt operations in storage.
   * @default true
   */
  encryptStorage?: boolean

  /**
   * Encrypt operations before network transmission.
   * Note: User's executor must handle encrypted payloads.
   * @default false
   */
  encryptNetwork?: boolean
}

/**
 * Encryption API exposed to users.
 */
export interface EncryptionAPI {
  /**
   * Manually encrypt a payload.
   */
  encrypt(payload: unknown): Promise<{ iv: string; data: string }>

  /**
   * Manually decrypt a payload.
   */
  decrypt(encrypted: { iv: string; data: string }): Promise<unknown>

  /**
   * Rotate encryption key.
   */
  rotateKey(newKey: string | CryptoKey, newSalt?: string): Promise<void>
}

/**
 * Encryption Plugin - encrypts operation payloads using AES-GCM.
 * Optional plugin (user must register manually).
 * Uses browser's built-in Web Crypto API.
 */
export class EncryptionPlugin implements Plugin {
  name = 'encryption'
  version = '1.0.0'
  type = 'optional' as const

  private options: Required<Omit<EncryptionOptions, 'salt'>> & Pick<EncryptionOptions, 'salt'>
  private cryptoKey?: CryptoKey
  private encryptedOperations: Set<string> = new Set()
  api!: EncryptionAPI

  constructor(options: EncryptionOptions) {
    this.options = {
      key: options.key,
      salt: options.salt,
      encryptStorage: options.encryptStorage ?? true,
      encryptNetwork: options.encryptNetwork ?? false,
    }
  }

  async install(_kernel: SyncKit): Promise<void> {
    // Check if Web Crypto API is available
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API not available. Encryption plugin cannot be used.')
    }

    // Derive key if string provided
    if (typeof this.options.key === 'string') {
      if (!this.options.salt) {
        throw new Error('Salt is required when using passphrase-based encryption')
      }
      this.cryptoKey = await this.deriveKey(this.options.key, this.options.salt)
    } else {
      this.cryptoKey = this.options.key
    }

    // Expose API
    this.api = {
      encrypt: this.encrypt.bind(this),
      decrypt: this.decrypt.bind(this),
      rotateKey: this.rotateKey.bind(this),
    }
  }

  async uninstall(): Promise<void> {
    this.encryptedOperations.clear()
    this.cryptoKey = undefined
  }

  /**
   * Plugin hooks.
   */
  hooks = {
    /**
     * Before adding to queue - encrypt if needed.
     */
    beforeQueue: async (operation: Operation): Promise<void> => {
      if (!this.options.encryptStorage || this.encryptedOperations.has(operation.id)) {
        return
      }

      try {
        const encrypted = await this.encrypt(operation.payload)
        ;(operation as any).payload = {
          __encrypted: true,
          ...encrypted,
        }
        this.encryptedOperations.add(operation.id)
      } catch (error) {
        console.error('Encryption failed:', error)
      }
    },

    /**
     * Before sync - encrypt for network if enabled.
     */
    beforeSync: async (operation: Operation): Promise<boolean> => {
      if (!this.options.encryptNetwork || this.encryptedOperations.has(operation.id)) {
        return true
      }

      try {
        const encrypted = await this.encrypt(operation.payload)
        ;(operation as any).payload = {
          __encrypted: true,
          ...encrypted,
        }
        this.encryptedOperations.add(operation.id)
      } catch (error) {
        console.error('Encryption failed:', error)
      }

      return true
    },

    /**
     * After sync - decrypt if needed.
     */
    afterSync: async (operation: Operation): Promise<void> => {
      if (!this.encryptedOperations.has(operation.id)) {
        return
      }

      try {
        const payload = operation.payload as any
        if (payload?.__encrypted) {
          const decrypted = await this.decrypt({
            iv: payload.iv,
            data: payload.data,
          })
          ;(operation as any).payload = decrypted
          this.encryptedOperations.delete(operation.id)
        }
      } catch (error) {
        console.error('Decryption failed:', error)
      }
    },
  }

  /**
   * Derive encryption key from passphrase using PBKDF2.
   * @private
   */
  private async deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
    // Import passphrase as key material
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt payload using AES-GCM.
   * @private
   */
  private async encrypt(payload: unknown): Promise<{ iv: string; data: string }> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not initialized')
    }

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Serialize payload
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(payload))

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.cryptoKey,
      data
    )

    return {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(new Uint8Array(encrypted)),
    }
  }

  /**
   * Decrypt payload using AES-GCM.
   * @private
   */
  private async decrypt(encrypted: { iv: string; data: string }): Promise<unknown> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not initialized')
    }

    // Decode IV and data
    const iv = this.base64ToArrayBuffer(encrypted.iv)
    const data = this.base64ToArrayBuffer(encrypted.data)

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as BufferSource,
      },
      this.cryptoKey,
      data.buffer as BufferSource
    )

    // Parse JSON
    const decoder = new TextDecoder()
    const json = decoder.decode(decrypted)
    return JSON.parse(json)
  }

  /**
   * Rotate encryption key.
   * @private
   */
  private async rotateKey(newKey: string | CryptoKey, newSalt?: string): Promise<void> {
    // Derive new key if string
    if (typeof newKey === 'string') {
      if (!newSalt) {
        throw new Error('Salt is required when using passphrase-based encryption')
      }
      this.cryptoKey = await this.deriveKey(newKey, newSalt)
      this.options.salt = newSalt
    } else {
      this.cryptoKey = newKey
    }

    // Update options
    this.options.key = newKey

    // Note: Existing encrypted data will need to be re-encrypted with the new key
    // This is left to the user to handle via decrypt/encrypt operations
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
 * Create encryption plugin instance.
 */
export function encryptionPlugin(options: EncryptionOptions): EncryptionPlugin {
  return new EncryptionPlugin(options)
}
