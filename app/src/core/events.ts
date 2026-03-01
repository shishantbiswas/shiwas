import type { Callback, EventManager, Key } from './types'
import { serializeKey } from './key'

/**
 * Event manager for handling SWR state changes
 */
export class SWREventManager implements EventManager {
  private listeners = new Map<string, Set<Callback>>()

  on(event: string, callback: Callback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    const eventListeners = this.listeners.get(event)!
    eventListeners.add(callback)
    
    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return
    
    // Create a copy to avoid issues with listeners being added/removed during iteration
    const listeners = Array.from(eventListeners)
    
    for (const callback of listeners) {
      try {
        callback(...args)
      } catch (error) {
        console.error('Error in event listener:', error)
      }
    }
  }

  off(event: string, callback: Callback): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return
    
    eventListeners.delete(callback)
    if (eventListeners.size === 0) {
      this.listeners.delete(event)
    }
  }

  // Clear all listeners for an event or all events
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  // Get the number of listeners for an event
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0
  }

  // Get all event names
  eventNames(): string[] {
    return Array.from(this.listeners.keys())
  }
}

/**
 * Key-specific event manager that handles events per cache key
 */
export class KeyEventManager {
  private eventManager = new SWREventManager()
  private keyListeners = new Map<string, Set<Callback>>()

  subscribe(key: Key, callback: Callback): () => void {
    const serializedKey = serializeKey(key)
    
    // Add to key-specific listeners
    if (!this.keyListeners.has(serializedKey)) {
      this.keyListeners.set(serializedKey, new Set())
    }
    this.keyListeners.get(serializedKey)!.add(callback)
    
    // Also subscribe to global events for this key
    const unsubscribeGlobal = this.eventManager.on(`key:${serializedKey}`, callback)
    
    // Return unsubscribe function
    return () => {
      const keyListeners = this.keyListeners.get(serializedKey)
      if (keyListeners) {
        keyListeners.delete(callback)
        if (keyListeners.size === 0) {
          this.keyListeners.delete(serializedKey)
        }
      }
      unsubscribeGlobal()
    }
  }

  emit(key: Key, ...args: any[]): void {
    const serializedKey = serializeKey(key)
    
    // Emit to key-specific listeners
    const keyListeners = this.keyListeners.get(serializedKey)
    if (keyListeners) {
      const listeners = Array.from(keyListeners)
      for (const callback of listeners) {
        try {
          callback(...args)
        } catch (error) {
          console.error('Error in key event listener:', error)
        }
      }
    }
    
    // Also emit to global event system
    this.eventManager.emit(`key:${serializedKey}`, ...args)
  }

  // Global events
  on(event: string, callback: Callback): () => void {
    return this.eventManager.on(event, callback)
  }

  emitGlobal(event: string, ...args: any[]): void {
    this.eventManager.emit(event, ...args)
  }

  clear(key?: Key): void {
    if (key) {
      const serializedKey = serializeKey(key)
      this.keyListeners.delete(serializedKey)
      this.eventManager.clear(`key:${serializedKey}`)
    } else {
      this.keyListeners.clear()
      this.eventManager.clear()
    }
  }

  // Get statistics
  getStats(): { keyListeners: number; globalListeners: number; totalKeys: number } {
    let totalKeyListeners = 0
    for (const listeners of this.keyListeners.values()) {
      totalKeyListeners += listeners.size
    }
    
    let totalGlobalListeners = 0
    for (const event of this.eventManager.eventNames()) {
      totalGlobalListeners += this.eventManager.listenerCount(event)
    }
    
    return {
      keyListeners: totalKeyListeners,
      globalListeners: totalGlobalListeners,
      totalKeys: this.keyListeners.size
    }
  }
}
