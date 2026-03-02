import type { Fetcher, FetcherOptions, Key, CacheEntry } from './types'
import { serializeKey } from './key'

/**
 * Request deduplication manager
 */
export class DeduplicationManager {
  private pendingRequests = new Map<string, Promise<unknown>>()
  private requestTimestamps = new Map<string, number>()
  
  constructor(private dedupingInterval: number = 2000) {}
  
  /**
   * Deduplicate a request by key
   */
  async dedupe<Data>(
    key: Key,
    fetcher: Fetcher<Data>,
    options: FetcherOptions
  ): Promise<Data> {
    const serializedKey = serializeKey(key)
    const now = Date.now()
    const lastRequest = this.requestTimestamps.get(serializedKey)
    
    // If there's a pending request within deduping interval, return it
    if (lastRequest && now - lastRequest < this.dedupingInterval) {
      const pendingRequest = this.pendingRequests.get(serializedKey)
      if (pendingRequest) {
        return pendingRequest as Promise<Data>
      }
    }
    
    // Create new request
    const requestPromise = this.createRequest(key, fetcher, options)
    
    // Store request
    this.pendingRequests.set(serializedKey, requestPromise)
    this.requestTimestamps.set(serializedKey, now)
    
    try {
      const result = await requestPromise
      return result
    } finally {
      // Clean up after request completes
      this.pendingRequests.delete(serializedKey)
      
      // Clean up timestamp after deduping interval
      setTimeout(() => {
        this.requestTimestamps.delete(serializedKey)
      }, this.dedupingInterval)
    }
  }
  
  private async createRequest<Data>(
    key: Key,
    fetcher: Fetcher<Data>,
    options: FetcherOptions
  ): Promise<Data> {
    try {
      return await fetcher(key, options)
    } catch (error) {
      // Re-throw to allow caller to handle
      throw error
    }
  }
  
  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear()
    this.requestTimestamps.clear()
  }
  
  /**
   * Get the number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }
  
  /**
   * Check if a request is pending for a key
   */
  isPending(key: Key): boolean {
    const serializedKey = serializeKey(key)
    return this.pendingRequests.has(serializedKey)
  }
}

/**
 * Fetch manager that handles data fetching with deduplication
 */
export class FetchManager {
  private deduplicationManager: DeduplicationManager
  private abortControllers = new Map<string, AbortController>()
  
  constructor(dedupingInterval: number = 2000) {
    this.deduplicationManager = new DeduplicationManager(dedupingInterval)
  }
  
  /**
   * Fetch data with deduplication and abort support
   */
  async fetch<Data>(
    key: Key,
    fetcher: Fetcher<Data>,
    options: {
      dedupe?: boolean
      timeout?: number
      signal?: AbortSignal
    } = {}
  ): Promise<Data> {
    const serializedKey = serializeKey(key)
    
    // Create abort controller for this request
    const abortController = new AbortController()
    this.abortControllers.set(serializedKey, abortController)
    
    // Handle external abort signal
    if (options.signal) {
      if (options.signal.aborted) {
        abortController.abort()
        throw new DOMException('Request aborted', 'AbortError')
      }
      
      options.signal.addEventListener('abort', () => {
        abortController.abort()
      }, { once: true })
    }
    
    // Handle timeout
    let timeoutId: NodeJS.Timeout | undefined
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        abortController.abort()
      }, options.timeout)
    }
    
    try {
      const fetcherOptions: FetcherOptions = {
        signal: abortController.signal
      }
      
      let result: Data
      
      if (options.dedupe !== false) {
        // Use deduplication
        result = await this.deduplicationManager.dedupe(key, fetcher, fetcherOptions)
      } else {
        // Direct fetch without deduplication
        result = await fetcher(key, fetcherOptions)
      }
      
      return result
    } catch (error) {
      // Check if request was aborted
      if (abortController.signal.aborted) {
        throw new DOMException('Request aborted', 'AbortError')
      }
      throw error
    } finally {
      // Cleanup
      this.abortControllers.delete(serializedKey)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }
  
  /**
   * Abort a specific request
   */
  abort(key: Key): void {
    const serializedKey = serializeKey(key)
    const controller = this.abortControllers.get(serializedKey)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(serializedKey)
    }
  }
  
  /**
   * Abort all pending requests
   */
  abortAll(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort()
    }
    this.abortControllers.clear()
    this.deduplicationManager.clear()
  }
  
  /**
   * Check if a request is in progress
   */
  isFetching(key: Key): boolean {
    const serializedKey = serializeKey(key)
    return this.abortControllers.has(serializedKey) || this.deduplicationManager.isPending(key)
  }
  
  /**
   * Get the number of active requests
   */
  getActiveCount(): number {
    return this.abortControllers.size
  }
  
  /**
   * Get the number of pending requests (including deduplicated)
   */
  getPendingCount(): number {
    return this.deduplicationManager.getPendingCount()
  }
}

/**
 * Utility function to create a fetcher from a URL
 */
export function createFetcher<Data = unknown>(
  input: string | URL,
  init?: RequestInit
): Fetcher<Data> {
  return async (key: Key, options: FetcherOptions) => {
    // If key is a string, use it as the URL
    const url = typeof key === 'string' ? key : String(key)
    
    const response = await fetch(url, {
      ...init,
      signal: options.signal
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json() as Promise<Data>
  }
}

/**
 * Utility function to create a fetcher with custom error handling
 */
export function createFetcherWithErrorHandler<Data = unknown>(
  fetcher: (url: string, options: RequestInit) => Promise<Response>,
  errorHandler?: (error: unknown, key: Key) => Error
): Fetcher<Data> {
  return async (key: Key, options: FetcherOptions) => {
    try {
      const url = typeof key === 'string' ? key : String(key)
      const response = await fetcher(url, { signal: options.signal })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return response.json() as Promise<Data>
    } catch (error) {
      if (errorHandler) {
        throw errorHandler(error, key)
      }
      throw error
    }
  }
}
