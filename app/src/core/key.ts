import type { Key } from './types'

/**
 * Key resolution and serialization utilities
 */

export function serializeKey(key: Key): string {
  if (key === null || key === undefined) {
    return 'null'
  }
  
  if (typeof key === 'string') {
    return key
  }
  
  if (Array.isArray(key)) {
    // Handle nested arrays and objects
    return `[${key.map(item => serializeKey(item)).join(',')}]`
  }
  
  if (typeof key === 'object') {
    try {
      return JSON.stringify(key, (k, v) => {
        // Handle functions by converting to string representation
        if (typeof v === 'function') {
          return `[Function: ${v.name || 'anonymous'}]`
        }
        // Handle undefined
        if (v === undefined) {
          return '[Undefined]'
        }
        // Handle symbols
        if (typeof v === 'symbol') {
          return `[Symbol: ${v.toString()}]`
        }
        return v
      })
    } catch (error) {
      // Fallback for circular references
      return '[Object]'
    }
  }
  
  return String(key)
}

export function resolveKey(key: Key | (() => Key)): Key {
  if (typeof key === 'function') {
    try {
      return key()
    } catch (error) {
      console.error('Error resolving key function:', error)
      return null
    }
  }
  return key
}

export function hashKey(key: Key): string {
  const serialized = serializeKey(key)
  
  // Simple hash function for better distribution
  let hash = 0
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

export function areKeysEqual(key1: Key, key2: Key): boolean {
  return serializeKey(key1) === serializeKey(key2)
}

export function isValidKey(key: Key): boolean {
  return key !== null && key !== undefined
}

export function normalizeKey(key: Key): string {
  if (!isValidKey(key)) {
    return 'null'
  }
  
  return serializeKey(key)
}
