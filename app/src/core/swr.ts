import type { 
  SWRCore, 
  Key, 
  CacheEntry, 
  Callback, 
  Unsubscribe, 
  SWRConfig,
  MutatorValue,
  MutatorOptions,
  RevalidateOptions,
  Fetcher
} from './types'
import { MemoryCache } from './cache'
import { KeyEventManager } from './events'
import { ConfigManager } from './options'
import { FetchManager } from './fetcher'
import { RevalidationManager } from './revalidate'
import { MutationManager } from './mutate'
import { resolveKey, serializeKey } from './key'

/**
 * Main SWR Core implementation
 */
export class SWRCoreImpl<Data = unknown, Error = unknown> implements SWRCore<Data, Error> {
  private cache: MemoryCache<Data, Error>
  private eventManager: KeyEventManager
  private configManager: ConfigManager<Data, Error>
  private fetchManager: FetchManager
  private revalidationManager: RevalidationManager<Data, Error>
  private mutationManager: MutationManager<Data, Error>
  
  // Track active keys for cleanup
  private activeKeys = new Set<string>()
  
  constructor(userConfig?: Partial<SWRConfig<Data, Error>>) {
    // Initialize core components
    this.configManager = new ConfigManager(userConfig)
    this.cache = new MemoryCache()
    this.eventManager = new KeyEventManager()
    this.fetchManager = new FetchManager(this.configManager.getDedupingInterval())
    
    // Initialize managers with dependencies
    this.revalidationManager = new RevalidationManager(
      this.fetchManager,
      this.configManager.get(),
      this.handleUpdate.bind(this)
    )
    
    this.mutationManager = new MutationManager(
      this.fetchManager,
      this.configManager.get(),
      this.handleUpdate.bind(this),
      (key) => this.get(key)?.data
    )
    
    // Setup global revalidation handlers
    this.setupGlobalHandlers()
  }
  
  /**
   * Get cache entry for a key
   */
  get(key: Key): CacheEntry<Data, Error> | undefined {
    const resolvedKey = resolveKey(key)
    if (!resolvedKey) return undefined
    
    return this.cache.get(resolvedKey)
  }
  
  /**
   * Subscribe to state changes for a key
   */
  subscribe(key: Key, callback: Callback<Data, Error>, fetcher?: Fetcher<Data>): Unsubscribe {
    const resolvedKey = resolveKey(key)
    if (!resolvedKey) {
      return () => {} // No-op for invalid keys
    }
    
    const serializedKey = serializeKey(resolvedKey)
    
    // Add to active keys
    this.activeKeys.add(serializedKey)
    
    // Check if we have an entry in cache
    const entry = this.cache.get(resolvedKey)
    
    // Subscribe to events
    const unsubscribe = this.eventManager.subscribe(resolvedKey, callback as Callback<unknown, unknown>)
    
    const config = this.configManager.get()

    // Start initial fetch if no data exists
    if (!entry) {
      if (config.revalidateOnMount !== false) {
        // Set initial loading state synchronously
        this.handleUpdate(resolvedKey, {
          isLoading: true,
          isValidating: true
        })
      }
      
      // Trigger initial revalidation asynchronously, but and check for deduplication
      setTimeout(() => {
        // Only revalidate if not already validating/loading (deduplication)
        const currentEntry = this.get(resolvedKey)
        if (currentEntry?.isLoading && !this.fetchManager.isFetching(resolvedKey)) {
          this.revalidate(resolvedKey, {
            fetcher,
            dedupe: true
          })
        } else if (!currentEntry) {
           this.revalidate(resolvedKey, {
            fetcher,
            dedupe: true
          })
        }
      }, 0)
    } else {
      // If data exists, revalidate if revalidateOnMount is not false
      if (config.revalidateOnMount !== false) {
        // Use Promise.resolve().then() for consistency with SWR behavior
        Promise.resolve().then(() => {
          this.revalidate(resolvedKey, { fetcher, dedupe: true })
        })
      }
    }
    
    // Return cleanup function
    return () => {
      unsubscribe()
      this.activeKeys.delete(serializedKey)
      this.revalidationManager.clear(resolvedKey)
    }
  }
  
  /**
   * Mutate data for a key
   */
  async mutate(
    key: Key,
    data?: MutatorValue<Data>,
    options?: MutatorOptions<Data>
  ): Promise<Data | undefined> {
    const resolvedKey = resolveKey(key)
    if (!resolvedKey) return undefined
    
    return this.mutationManager.mutate(resolvedKey, data, options)
  }
  
  /**
   * Revalidate data for a key
   */
  async revalidate(key: Key, options?: RevalidateOptions): Promise<boolean> {
    const resolvedKey = resolveKey(key)
    if (!resolvedKey) return false
    
    return this.revalidationManager.revalidate(resolvedKey, options as RevalidateOptions<Data>)
  }
  
  /**
   * Delete cache entry for a key
   */
  delete(key: Key): void {
    const resolvedKey = resolveKey(key)
    if (!resolvedKey) return
    
    const serializedKey = serializeKey(resolvedKey)
    
    this.cache.delete(resolvedKey)
    this.revalidationManager.clear(resolvedKey)
    this.eventManager.clear(resolvedKey)
    this.activeKeys.delete(serializedKey)
    
    // Emit delete event
    this.eventManager.emit(resolvedKey, undefined, undefined, false, false)
  }
  
  /**
   * Clear all cache and state
   */
  clear(): void {
    this.cache.clear()
    this.revalidationManager.clearAll()
    this.eventManager.clear()
    this.fetchManager.abortAll()
    this.mutationManager.clearOptimisticData()
    this.activeKeys.clear()
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<SWRConfig<Data, Error>>): void {
    this.configManager.update(config)
    
    // Update managers with new config
    this.revalidationManager.updateConfig(this.configManager.get())
    
    // Restart interval revalidation for active keys
    for (const serializedKey of this.activeKeys) {
      try {
        const key = JSON.parse(serializedKey) as Key
        this.revalidationManager.startIntervalRevalidation(key)
      } catch {
        // Skip invalid keys
      }
    }
  }
  
  /**
   * Get current configuration
   */
  getConfig(): SWRConfig<Data, Error> {
    return this.configManager.get()
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    keys: Key[]
    activeKeys: number
  } {
    return {
      size: this.cache.size(),
      keys: this.cache.keys(),
      activeKeys: this.activeKeys.size
    }
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    activeRequests: number
    pendingRequests: number
    revalidations: unknown
  } {
    return {
      activeRequests: this.fetchManager.getActiveCount(),
      pendingRequests: this.fetchManager.getPendingCount(),
      revalidations: this.revalidationManager.getStats()
    }
  }
  
  /**
   * Handle cache updates and emit events
   */
  private handleUpdate(key: Key, update: Partial<CacheEntry<Data, Error>>): void {
    const currentEntry = this.cache.get(key)
    const updatedEntry: CacheEntry<Data, Error> = {
      data: currentEntry?.data,
      error: currentEntry?.error,
      isValidating: currentEntry?.isValidating || false,
      isLoading: currentEntry?.isLoading || false,
      lastModified: currentEntry?.lastModified || Date.now(),
      ...update
    }
    
    // Update cache
    this.cache.set(key, updatedEntry)
    
    // Start/stop interval revalidation based on data availability
    if (updatedEntry.data !== undefined) {
      this.revalidationManager.startIntervalRevalidation(key)
    } else {
      this.revalidationManager.stopIntervalRevalidation(key)
    }
    
    // Emit state change
    this.eventManager.emit(
      key,
      updatedEntry.data,
      updatedEntry.error,
      updatedEntry.isValidating,
      updatedEntry.isLoading
    )
  }
  
  /**
   * Fetch initial data for a key
   */
  private async fetchInitialData(key: Key, fetcher?: Fetcher<Data>): Promise<void> {
    const config = this.configManager.get()
    const activeFetcher = fetcher || config.fetcher
    
    if (!activeFetcher) return
    
    try {
      // Set loading state
      this.handleUpdate(key, { isLoading: true, isValidating: true })
      
      const data = await this.fetchManager.fetch(key, activeFetcher, {
        dedupe: true,
        timeout: config.loadingTimeout
      })
      
      // Update with data
      this.handleUpdate(key, {
        data,
        error: undefined,
        isLoading: false,
        isValidating: false
      })
      
      config.onSuccess?.(data, key)
    } catch (error) {
      const errorObj = error as Error
      
      // Update with error
      this.handleUpdate(key, {
        error: errorObj,
        isLoading: false,
        isValidating: false
      })
      
      config.onError?.(errorObj, key)
    }
  }
  
  /**
   * Setup global event handlers
   */
  private setupGlobalHandlers(): void {
    // This will be handled by the RevalidationManager
    // which has its own global event setup
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear()
    this.cache.destroy?.()
  }
}

/**
 * Create a new SWR instance
 */
export function createSWR<Data = unknown, Error = unknown>(
  config?: Partial<SWRConfig<Data, Error>>
): SWRCore<Data, Error> {
  return new SWRCoreImpl<Data, Error>(config)
}
