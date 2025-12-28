import { describe, it, expect } from 'vitest'
import { createSyncKit } from '../src/index'

describe('SyncKit', () => {
  it('should export createSyncKit function', () => {
    expect(createSyncKit).toBeDefined()
    expect(typeof createSyncKit).toBe('function')
  })

  it('should create a SyncKit instance', () => {
    const sync = createSyncKit({
      name: 'test-sync',
      storage: 'indexeddb',
      executor: async () => ({ success: true })
    })

    expect(sync).toBeDefined()
    expect(sync.init).toBeDefined()
    expect(sync.push).toBeDefined()
    expect(sync.on).toBeDefined()
  })
})
