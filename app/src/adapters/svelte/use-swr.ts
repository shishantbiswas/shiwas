import { writable, derived } from 'svelte/store'
import { createSWR } from '../../core'
import type { SWRConfig, SWRStores, SWRStore, Key, Fetcher, SWRFetcher } from './types'

// Global SWR instance
const globalSWR = createSWR()

/**
 * Enhanced useSWR store for Svelte
 */
export function useSWR<Data = any, Error = any>(
  key: Key | null,
  fetcher?: SWRFetcher<Data> | null,
  config?: Partial<SWRConfig<Data, Error>>
): SWRStores<Data, Error> {
  // Get config from context (using a simple object for now)
  const contextConfig = {} as any
  const mergedConfig = {
    ...contextConfig,
    ...config
  }

  // Update config if provided
  if (mergedConfig) {
    globalSWR.updateConfig(mergedConfig as any)
  }

  // Initial state logic
  let initialData: Data | undefined = undefined
  let initialError: Error | undefined = undefined
  let initialIsLoading = false
  let initialIsValidating = false

  if (key) {
    const entry = globalSWR.get(key)
    if (entry) {
      initialData = entry.data
      initialError = entry.error
      initialIsLoading = entry.isLoading
      initialIsValidating = entry.isValidating
    }
  }

  // Create base stores
  const dataStore = writable<Data | undefined>(initialData)
  const errorStore = writable<Error | undefined>(initialError)
  const isLoadingStore = writable<boolean>(initialIsLoading)
  const isValidatingStore = writable<boolean>(initialIsValidating)

  // Subscribe to SWR changes
  let unsubscribe: (() => void) | undefined

  const normalizedFetcher = fetcher ? (
    fetcher.length === 2 ? fetcher : (k: Key, options: any) => {
      if (Array.isArray(k)) {
        return (fetcher as any)(...k)
      }
      return (fetcher as any)(k)
    }
  ) : null

  if (key) {
    unsubscribe = globalSWR.subscribe(key, (newData: any, newError: any, newIsValidating: any, newIsLoading: any) => {
      dataStore.set(newData)
      errorStore.set(newError)
      isValidatingStore.set(newIsValidating ?? false)
      isLoadingStore.set(newIsLoading ?? false)
    }, normalizedFetcher as any)
  }

  // Create mutate function
  const mutate = (mutateData?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: any) => {
    if (!key) return Promise.resolve(undefined)
    return globalSWR.mutate(key, mutateData, options)
  }

  return {
    data: { subscribe: dataStore.subscribe },
    error: { subscribe: errorStore.subscribe },
    isLoading: { subscribe: isLoadingStore.subscribe },
    isValidating: { subscribe: isValidatingStore.subscribe },
    loading: { subscribe: isLoadingStore.subscribe },
    validating: { subscribe: isValidatingStore.subscribe },
    mutate
  }
}

/**
 * Enhanced useSWR store with all state combined
 */
export function useSWRStore<Data = any, Error = any>(
  key: Key | null,
  fetcher?: Fetcher<Data> | null,
  config?: Partial<SWRConfig<Data, Error>>
): SWRStore<Data, Error> {
  const stores = useSWR<Data, Error>(key, fetcher, config)
  
  let initialData: Data | undefined;
  let initialError: Error | undefined;
  let initialIsLoading = false;
  let initialIsValidating = false;
  
  stores.data.subscribe(v => initialData = v)();
  stores.error.subscribe(v => initialError = v)();
  stores.isLoading.subscribe(v => initialIsLoading = v)();
  stores.isValidating.subscribe(v => initialIsValidating = v)();

  const combinedStore = writable<{
    data?: Data
    error?: Error
    isLoading: boolean
    isValidating: boolean
    loading: boolean
    validating: boolean
  }>({
    data: initialData,
    error: initialError,
    isLoading: initialIsLoading,
    isValidating: initialIsValidating,
    loading: initialIsLoading,
    validating: initialIsValidating
  })

  // Update combined store when individual stores change
  const unsubscribeData = stores.data.subscribe((data: any) => {
    combinedStore.update((state: any) => ({ ...state, data }))
  })
  
  const unsubscribeError = stores.error.subscribe((error: any) => {
    combinedStore.update((state: any) => ({ ...state, error }))
  })
  
  const unsubscribeLoading = stores.isLoading.subscribe((isLoading: any) => {
    combinedStore.update((state: any) => ({ ...state, isLoading, loading: isLoading }))
  })
  
  const unsubscribeValidating = stores.isValidating.subscribe((isValidating: any) => {
    combinedStore.update((state: any) => ({ ...state, isValidating, validating: isValidating }))
  })

  // Cleanup on destroy
  const unsubscribeAll = () => {
    unsubscribeData()
    unsubscribeError()
    unsubscribeLoading()
    unsubscribeValidating()
  }

  // Manual cleanup for compatibility
  unsubscribeAll()

  return {
    ...combinedStore,
    mutate: stores.mutate
  }
}

/**
 * Hook for manual mutation
 */
export function useSWRMutate<Data = any, Error = any>() {
  return (key: Key, data?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: any) => {
    return globalSWR.mutate(key, data, options)
  }
}

/**
 * Hook for accessing global SWR instance
 */
export function useSWRInstance() {
  return globalSWR
}

/**
 * Hook for prefetching data
 */
export function useSWRPrefetch<Data = any, Error = any>() {
  return (key: Key, fetcher: Fetcher<Data>) => {
    return globalSWR.revalidate(key, { dedupe: true })
  }
}

export default useSWR
