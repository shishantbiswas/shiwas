import type { Key, RevalidateOptions, SWRConfig, CacheEntry } from './types'
import { serializeKey } from './key'
import { FetchManager } from './fetcher'

/**
 * Revalidation manager handles different revalidation strategies
 */
export class RevalidationManager<Data = any, Error = any> {
  private intervals = new Map<string, NodeJS.Timeout>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private retryAttempts = new Map<string, number>()
  
  constructor(
    private fetchManager: FetchManager,
    private config: SWRConfig<Data, Error>,
    private onUpdate: (key: Key, entry: Partial<CacheEntry<Data, Error>>) => void
  ) {}
  
  /**
   * Start interval revalidation for a key
   */
  startIntervalRevalidation(key: Key): void {
    const serializedKey = serializeKey(key)
    const interval = this.config.refreshInterval
    
    if (!interval || interval <= 0) return
    
    // Clear existing interval
    this.stopIntervalRevalidation(key)
    
    const intervalId = setInterval(() => {
      if (!this.config.isPaused?.()) {
        this.revalidate(key, { dedupe: true })
      }
    }, interval)
    
    this.intervals.set(serializedKey, intervalId)
  }
  
  /**
   * Stop interval revalidation for a key
   */
  stopIntervalRevalidation(key: Key): void {
    const serializedKey = serializeKey(key)
    const intervalId = this.intervals.get(serializedKey)
    
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(serializedKey)
    }
  }
  
  /**
   * Revalidate on focus
   */
  revalidateOnFocus(key: Key): void {
    if (!this.config.revalidateOnFocus || this.config.isPaused?.()) return
    
    this.revalidate(key, { dedupe: true })
  }
  
  /**
   * Revalidate on reconnect
   */
  revalidateOnReconnect(key: Key): void {
    if (!this.config.revalidateOnReconnect || this.config.isPaused?.()) return
    
    this.revalidate(key, { dedupe: true })
  }
  
  /**
   * Manual revalidation
   */
  async revalidate(key: Key, options: RevalidateOptions<Data> = {}): Promise<boolean> {
    const serializedKey = serializeKey(key)
    const fetcher = options.fetcher || this.config.fetcher
    
    if (!fetcher) {
      console.warn('No fetcher provided for revalidation')
      return false
    }
    
    try {
      // Set loading state
      this.onUpdate(key, { isValidating: true })
      
      const data = await this.fetchManager.fetch(key, fetcher, {
        dedupe: options.dedupe !== false,
        timeout: this.config.loadingTimeout
      })
      
      // Update cache with new data
      this.onUpdate(key, {
        data,
        error: undefined,
        isValidating: false,
        isLoading: false,
        lastModified: Date.now()
      })
      
      // Reset retry attempts on success
      this.retryAttempts.delete(serializedKey)
      
      // Call success callback
      this.config.onSuccess?.(data, key)
      
      return true
    } catch (error) {
      const errorObj = error as Error
      
      // Update cache with error
      this.onUpdate(key, {
        error: errorObj,
        isValidating: false,
        isLoading: false,
        lastModified: Date.now()
      })
      
      // Call error callback
      this.config.onError?.(errorObj, key)
      
      // Handle retry logic
      await this.handleRetry(key, errorObj)
      
      return false
    }
  }
  
  /**
   * Handle error retry logic
   */
  private async handleRetry(key: Key, error: Error): Promise<void> {
    const serializedKey = serializeKey(key)
    const retryCount = this.retryAttempts.get(serializedKey) || 0
    const maxRetries = this.config.errorRetryCount || 0
    
    if (retryCount >= maxRetries) {
      this.retryAttempts.delete(serializedKey)
      return
    }
    
    // Increment retry count
    this.retryAttempts.set(serializedKey, retryCount + 1)
    
    // Calculate retry delay with exponential backoff
    const baseInterval = this.config.errorRetryInterval || 5000
    const delay = Math.min(baseInterval * Math.pow(2, retryCount), 30000)
    
    // Schedule retry
    const timeoutId = setTimeout(() => {
      if (!this.config.isPaused?.()) {
        this.revalidate(key, { dedupe: true })
      }
    }, delay)
    
    this.timeouts.set(`${serializedKey}:retry`, timeoutId)
  }
  
  /**
   * Cancel retry for a key
   */
  cancelRetry(key: Key): void {
    const serializedKey = serializeKey(key)
    const timeoutId = this.timeouts.get(`${serializedKey}:retry`)
    
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(`${serializedKey}:retry`)
    }
    
    this.retryAttempts.delete(serializedKey)
  }
  
  /**
   * Clear all revalidation for a key
   */
  clear(key: Key): void {
    this.stopIntervalRevalidation(key)
    this.cancelRetry(key)
    
    const serializedKey = serializeKey(key)
    
    // Clear any other timeouts for this key
    for (const [timeoutKey, timeoutId] of this.timeouts.entries()) {
      if (timeoutKey.startsWith(serializedKey)) {
        clearTimeout(timeoutId)
        this.timeouts.delete(timeoutKey)
      }
    }
  }
  
  /**
   * Clear all revalidation
   */
  clearAll(): void {
    // Clear all intervals
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId)
    }
    this.intervals.clear()
    
    // Clear all timeouts
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.timeouts.clear()
    
    // Clear retry attempts
    this.retryAttempts.clear()
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<SWRConfig<Data, Error>>): void {
    this.config = { ...this.config, ...config }
    
    // Restart interval revalidation with new config if needed
    // This would need to be called for all active keys
  }
  
  /**
   * Get revalidation statistics
   */
  getStats(): {
    intervalRevalidations: number
    pendingRetries: number
    retryAttempts: Map<string, number>
  } {
    return {
      intervalRevalidations: this.intervals.size,
      pendingRetries: this.timeouts.size,
      retryAttempts: new Map(this.retryAttempts)
    }
  }
}

/**
 * Setup global event listeners for focus and reconnect
 */
export function setupGlobalRevalidationHandlers(
  revalidationManager: RevalidationManager,
  keys: Key[]
): () => void {
  const handleFocus = () => {
    for (const key of keys) {
      revalidationManager.revalidateOnFocus(key)
    }
  }
  
  const handleReconnect = () => {
    for (const key of keys) {
      revalidationManager.revalidateOnReconnect(key)
    }
  }
  
  const handleVisibilityChange = () => {
    if (typeof globalThis !== 'undefined' && 'document' in globalThis && !(globalThis as any).document.hidden) {
      handleFocus()
    }
  }
  
  // Add event listeners
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    const globalObj = globalThis as any
    globalObj.addEventListener('focus', handleFocus)
    globalObj.addEventListener('online', handleReconnect)
    if ('document' in globalObj) {
      globalObj.document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  }
  
  // Return cleanup function
  return () => {
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      const globalObj = globalThis as any
      globalObj.removeEventListener('focus', handleFocus)
      globalObj.removeEventListener('online', handleReconnect)
      if ('document' in globalObj) {
        globalObj.document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }
}
