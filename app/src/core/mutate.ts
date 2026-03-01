import type { 
  Key, 
  MutatorOptions, 
  MutatorValue, 
  MutatorCallback, 
  CacheEntry, 
  SWRConfig,
  Fetcher
} from './types'
import { serializeKey } from './key'
import { FetchManager } from './fetcher'

/**
 * Mutation manager for handling data mutations with optimistic updates
 */
export class MutationManager<Data = any, Error = any> {
  private optimisticData = new Map<string, Data>()
  private rollbackData = new Map<string, Data | undefined>()
  
  constructor(
    private fetchManager: FetchManager,
    private config: SWRConfig<Data, Error>,
    private onUpdate: (key: Key, entry: Partial<CacheEntry<Data, Error>>) => void,
    private getCurrentData: (key: Key) => Data | undefined
  ) {}
  
  /**
   * Mutate data for a key
   */
  async mutate(
    key: Key,
    data?: MutatorValue<Data>,
    options: MutatorOptions<Data> = {}
  ): Promise<Data | undefined> {
    const serializedKey = serializeKey(key)
    const currentData = this.getCurrentData(key)
    
    // Store rollback data if needed
    if (options.rollbackOnError !== false && currentData !== undefined) {
      this.rollbackData.set(serializedKey, currentData)
    }
    
    try {
      // Handle optimistic data
      if (options.optimisticData !== undefined) {
        this.optimisticData.set(serializedKey, options.optimisticData)
        this.onUpdate(key, {
          data: options.optimisticData,
          isLoading: false,
          isValidating: false
        })
      } else if (data !== undefined) {
        // Handle immediate data update
        const newData = await this.resolveData(data, currentData)
        this.optimisticData.set(serializedKey, newData)
        this.onUpdate(key, {
          data: newData,
          isLoading: false,
          isValidating: false
        })
      }
      
      // Revalidate if requested
      if (options.revalidate !== false) {
        await this.revalidate(key)
      }
      
      // Return the final data
      return this.getCurrentData(key)
    } catch (error) {
      // Rollback on error if requested
      if (options.rollbackOnError !== false) {
        const rollbackValue = this.rollbackData.get(serializedKey)
        if (rollbackValue !== undefined) {
          this.onUpdate(key, {
            data: rollbackValue,
            error: error as Error,
            isLoading: false,
            isValidating: false
          })
        }
      }
      
      throw error
    } finally {
      // Clean up optimistic data
      this.optimisticData.delete(serializedKey)
      this.rollbackData.delete(serializedKey)
    }
  }
  
  /**
   * Resolve data from various input types
   */
  private async resolveData(
    data: MutatorValue<Data>,
    currentData: Data | undefined
  ): Promise<Data> {
    if (typeof data === 'function') {
      const result = (data as MutatorCallback<Data>)(currentData)
      return Promise.resolve(result)
    }
    
    if (data === undefined) {
      throw new Error('Mutation data cannot be undefined')
    }
    
    return data
  }
  
  /**
   * Revalidate a key after mutation
   */
  private async revalidate(key: Key): Promise<void> {
    const fetcher = this.config.fetcher
    if (!fetcher) return
    
    try {
      this.onUpdate(key, { isValidating: true })
      
      const freshData = await this.fetchManager.fetch(key, fetcher, {
        dedupe: false, // Always fetch fresh data for revalidation
        timeout: this.config.loadingTimeout
      })
      
      // Update with fresh data
      this.onUpdate(key, {
        data: freshData,
        error: undefined,
        isValidating: false,
        isLoading: false
      })
      
      this.config.onSuccess?.(freshData, key)
    } catch (error) {
      const errorObj = error as Error
      
      this.onUpdate(key, {
        error: errorObj,
        isValidating: false,
        isLoading: false
      })
      
      this.config.onError?.(errorObj, key)
    }
  }
  
  /**
   * Check if a key has optimistic data
   */
  hasOptimisticData(key: Key): boolean {
    const serializedKey = serializeKey(key)
    return this.optimisticData.has(serializedKey)
  }
  
  /**
   * Get optimistic data for a key
   */
  getOptimisticData(key: Key): Data | undefined {
    const serializedKey = serializeKey(key)
    return this.optimisticData.get(serializedKey)
  }
  
  /**
   * Clear all optimistic data
   */
  clearOptimisticData(): void {
    this.optimisticData.clear()
    this.rollbackData.clear()
  }
  
  /**
   * Create a mutation function for a specific key
   */
  createMutator(key: Key) {
    return (
      data?: MutatorValue<Data>,
      options?: MutatorOptions<Data>
    ): Promise<Data | undefined> => {
      return this.mutate(key, data, options)
    }
  }
  
  /**
   * Batch mutate multiple keys
   */
  async mutateBatch(
    mutations: Array<{
      key: Key
      data?: MutatorValue<Data>
      options?: MutatorOptions<Data>
    }>
  ): Promise<(Data | undefined)[]> {
    const results = await Promise.allSettled(
      mutations.map(({ key, data, options }) => this.mutate(key, data, options))
    )
    
    return results.map((result, index) => {
      const mutation = mutations[index]
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`Mutation failed for key ${mutation?.key}:`, result.reason || 'Unknown error')
        return undefined
      }
    })
  }
}

/**
 * Utility function to create a mutator
 */
export function createMutator<Data = any, Error = any>(
  fetchManager: FetchManager,
  config: SWRConfig<Data, Error>,
  onUpdate: (key: Key, entry: Partial<CacheEntry<Data, Error>>) => void,
  getCurrentData: (key: Key) => Data | undefined
): MutationManager<Data, Error> {
  return new MutationManager(fetchManager, config, onUpdate, getCurrentData)
}

/**
 * Higher-order function that creates a mutate function
 */
export function createMutateFunction<Data = any, Error = any>(
  mutationManager: MutationManager<Data, Error>
) {
  return (
    key: Key,
    data?: MutatorValue<Data>,
    options?: MutatorOptions<Data>
  ): Promise<Data | undefined> => {
    return mutationManager.mutate(key, data, options)
  }
}

/**
 * Utility for creating optimistic mutations
 */
export function createOptimisticMutation<Data = any>(
  currentData: Data,
  updateFn: (current: Data) => Data
): {
  optimisticData: Data
  rollbackData: Data
} {
  return {
    optimisticData: updateFn(currentData),
    rollbackData: currentData
  }
}

/**
 * Utility for creating async mutations
 */
export function createAsyncMutation<Data = any>(
  asyncFn: (currentData?: Data) => Promise<Data>
): MutatorCallback<Data> {
  return async (currentData?: Data) => {
    return await asyncFn(currentData)
  }
}
