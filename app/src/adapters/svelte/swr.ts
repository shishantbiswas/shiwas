import { writable, derived } from 'svelte/store'
import { onDestroy } from 'svelte'
import { createSWR } from '../../core'
import type { SWRStores, SWRStore, Key, Fetcher, SWRFetcher } from './types'

// Global SWR instance
const globalSWR = createSWR()

/**
 * Create SWR stores for Svelte
 */
export function createSWRStores<Data = unknown, Error = unknown>(
  key: Key | null,
  fetcher?: SWRFetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
): SWRStores<Data, Error> {
  // Update config if provided
  if (config) {
    globalSWR.updateConfig(config as any)
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
    unsubscribe = globalSWR.subscribe(key, (newData, newError, newIsValidating, newIsLoading) => {
      dataStore.set(newData)
      errorStore.set(newError)
      isValidatingStore.set(newIsValidating ?? false)
      isLoadingStore.set(newIsLoading ?? false)
    }, normalizedFetcher as any)
  }

  // Cleanup on destroy
  onDestroy(() => {
    unsubscribe?.()
  })

  // Create mutate function
  const mutate = (mutateData?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<import('../../core').MutatorOptions<Data>>) => {
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
 * Create a single SWR store containing all state
 */
export function createSWRStore<Data = unknown, Error = unknown>(
  key: Key | null,
  fetcher?: Fetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
): SWRStore<Data, Error> {
  const stores = createSWRStores<Data, Error>(key, fetcher, config)
  
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
  const unsubscribeData = stores.data.subscribe(data => {
    combinedStore.update(state => ({ ...state, data }))
  })
  
  const unsubscribeError = stores.error.subscribe(error => {
    combinedStore.update(state => ({ ...state, error }))
  })
  
  const unsubscribeLoading = stores.isLoading.subscribe(isLoading => {
    combinedStore.update(state => ({ ...state, isLoading, loading: isLoading }))
  })
  
  const unsubscribeValidating = stores.isValidating.subscribe(isValidating => {
    combinedStore.update(state => ({ ...state, isValidating, validating: isValidating }))
  })

  // Cleanup on destroy
  onDestroy(() => {
    unsubscribeData()
    unsubscribeError()
    unsubscribeLoading()
    unsubscribeValidating()
  })

  return {
    ...combinedStore,
    mutate: stores.mutate
  }
}

/**
 * Individual store creators
 */
export function swrDataStore<Data = unknown>(
  key: Key | null,
  fetcher?: Fetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
) {
  return createSWRStores<Data, unknown>(key, fetcher, config as any).data
}

export function swrErrorStore<Error = unknown>(
  key: Key | null,
  fetcher?: Fetcher<any>,
  config?: Partial<import('./types').SWRConfig<any, Error>>
) {
  return createSWRStores<any, Error>(key, fetcher, config).error
}

export function swrLoadingStore(
  key: Key | null,
  fetcher?: Fetcher<any>,
  config?: Partial<import('./types').SWRConfig<any, any>>
) {
  return createSWRStores<any, any>(key, fetcher, config).isLoading
}

export function swrValidatingStore(
  key: Key | null,
  fetcher?: Fetcher<any>,
  config?: Partial<import('./types').SWRConfig<any, any>>
) {
  return createSWRStores<any, any>(key, fetcher, config).isValidating
}

/**
 * Hook for manual mutation
 */
export function useSWRMutate<Data = unknown, Error = unknown>() {
  return (key: Key, data?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<import('../../core').MutatorOptions<Data>>) => {
    return globalSWR.mutate(key, data, options)
  }
}

/**
 * Hook for accessing global SWR instance
 */
export function useSWRInstance() {
  return globalSWR
}

export default createSWRStores
