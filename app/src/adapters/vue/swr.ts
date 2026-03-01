import { ref, computed, onUnmounted, watch } from 'vue'
import { createSWR } from '../../core'
import type { Key, Fetcher, SWRConfig as CoreSWRConfig } from '../../core'
import type { SWRRefs, SWRRef, SWRConfig } from './types'

// Create a basic Vue SWR implementation
export function createSWRComposables<Data = any, Error = any>(
  key: Key,
  fetcher: Fetcher<Data>,
  config?: SWRConfig<Data, Error>
): SWRRefs<Data, Error> {
  const swr = createSWR<Data, Error>({ fetcher, ...config })
  
  const data = ref<Data | undefined>()
  const error = ref<Error | undefined>()
  const loading = ref(false)
  const validating = ref(false)

  // Subscribe to SWR changes
  const unsubscribe = swr.subscribe(key, (newData, newError, newValidating, newLoading) => {
    data.value = newData
    error.value = newError
    validating.value = newValidating
    loading.value = newLoading
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    data,
    error,
    loading,
    validating,
    mutate: (mutateData, options) => swr.mutate(key, mutateData as any, options),
    revalidate: (options) => swr.revalidate(key, options)
  }
}

export function createSWRRef<Data = any, Error = any>(
  key: Key,
  fetcher: Fetcher<Data>,
  config?: SWRConfig<Data, Error>
): SWRRef<Data, Error> {
  return createSWRComposables(key, fetcher, config) as SWRRef<Data, Error>
}

// Export individual refs for convenience
export const swrDataRef = <T>(key: Key, fetcher: Fetcher<T>, config?: SWRConfig<T>) => 
  createSWRRef(key, fetcher, config).data

export const swrErrorRef = <T>(key: Key, fetcher: Fetcher<T>, config?: SWRConfig<T>) => 
  createSWRRef(key, fetcher, config).error

export const swrLoadingRef = <T>(key: Key, fetcher: Fetcher<T>, config?: SWRConfig<T>) => 
  createSWRRef(key, fetcher, config).loading

export const swrValidatingRef = <T>(key: Key, fetcher: Fetcher<T>, config?: SWRConfig<T>) => 
  createSWRRef(key, fetcher, config).validating

// Hook-like function for Vue
export function useSWR<Data = any, Error = any>(
  key: Key,
  fetcher: Fetcher<Data>,
  config?: SWRConfig<Data, Error>
): SWRRefs<Data, Error> {
  return createSWRComposables(key, fetcher, config)
}

export function useSWRMutate<Data = any, Error = any>(
  key: Key,
  fetcher: Fetcher<Data>,
  config?: SWRConfig<Data, Error>
): SWRRefs<Data, Error> {
  return createSWRComposables(key, fetcher, config)
}

export function useSWRInstance<Data = any, Error = any>(
  key: Key,
  fetcher: Fetcher<Data>,
  config?: SWRConfig<Data, Error>
): SWRRefs<Data, Error> {
  return createSWRComposables(key, fetcher, config)
}
