import type { Cache, CacheEntry, Key } from './types'

/**
 * LRU Cache implementation with TTL support
 */
export class LRUCache<Data = any, Error = any> implements Cache<Data, Error> {
  private cache = new Map<string, CacheEntry<Data, Error>>()
  private maxSize: number

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  private serializeKey(key: Key): string {
    if (key === null || key === undefined) {
      return 'null'
    }
    
    if (typeof key === 'string') {
      return key
    }
    
    if (Array.isArray(key)) {
      return `["${key.join('","')}"]`
    }
    
    return JSON.stringify(key)
  }

  private isExpired(entry: CacheEntry<Data, Error>): boolean {
    if (!entry.ttl) return false
    return Date.now() - entry.lastModified > entry.ttl
  }

  get(key: Key): CacheEntry<Data, Error> | undefined {
    const serializedKey = this.serializeKey(key)
    const entry = this.cache.get(serializedKey)
    
    if (!entry) return undefined
    
    if (this.isExpired(entry)) {
      this.cache.delete(serializedKey)
      return undefined
    }
    
    // Move to end (LRU behavior)
    this.cache.delete(serializedKey)
    this.cache.set(serializedKey, entry)
    
    return entry
  }

  set(key: Key, value: CacheEntry<Data, Error>): void {
    const serializedKey = this.serializeKey(key)
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(serializedKey)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(serializedKey, {
      ...value,
      lastModified: Date.now()
    })
  }

  delete(key: Key): void {
    const serializedKey = this.serializeKey(key)
    this.cache.delete(serializedKey)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): Key[] {
    return Array.from(this.cache.keys()).map(key => {
      try {
        return JSON.parse(key)
      } catch {
        return key
      }
    })
  }

  has(key: Key): boolean {
    const serializedKey = this.serializeKey(key)
    const entry = this.cache.get(serializedKey)
    
    if (!entry) return false
    
    if (this.isExpired(entry)) {
      this.cache.delete(serializedKey)
      return false
    }
    
    return true
  }

  // Cleanup expired entries
  cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache size
  size(): number {
    return this.cache.size
  }
}

/**
 * Memory cache with automatic cleanup
 */
export class MemoryCache<Data = any, Error = any> extends LRUCache<Data, Error> {
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(maxSize: number = 1000, cleanupIntervalMs: number = 60000) {
    super(maxSize)
    
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, cleanupIntervalMs)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}
