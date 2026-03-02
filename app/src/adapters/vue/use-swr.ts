import { ref, computed, onUnmounted, Suspense, defineComponent, provide, inject, watch } from 'vue'
import { createSWR } from '../../core'
import type { SWRConfig as SWRConfiguration, SWRRefs, Key, Fetcher, SWRFetcher } from './types'

// Global SWR instance
const globalSWR = createSWR()

// Vue injection key for configuration
const SWR_CONFIG_KEY = Symbol('swr-config')

/**
 * Enhanced useSWR composable for Vue
 */
export function useSWR<Data = unknown, Error = unknown>(
  key: Key | null,
  fetcher?: SWRFetcher<Data> | null,
  config?: Partial<SWRConfiguration<Data, Error>>
): SWRRefs<Data, Error> {
  // Get config from injection and props
  const injectedConfig = inject(SWR_CONFIG_KEY, {})
  const mergedConfig = computed(() => ({
    ...injectedConfig,
    ...config
  }))

  // Create a stable reference to SWR instance with config
  const swrRef = ref(globalSWR)
  
  // Update config if changed
  watch(mergedConfig, (newConfig) => {
    if (newConfig) {
      swrRef.value.updateConfig(newConfig as Partial<SWRConfiguration<Data, Error>> as any)
    }
  }, { deep: true })

  // Normalize fetcher to handle different signatures
  const normalizedFetcher = computed(() => {
    const f = typeof fetcher === 'function' ? fetcher : null
    if (!f) return null
    
    // If it's already a core fetcher, use it as-is
    if (f.length === 2) return f as Fetcher<Data>
    
    // Convert bare fetcher to core fetcher
    return (k: Key, options: unknown) => {
      if (Array.isArray(k)) {
        return (f as (...args: unknown[]) => Promise<Data>)(...k)
      }
      return (f as (arg: unknown) => Promise<Data>)(k)
    }
  })

  // Create refs
  const data = ref<Data | undefined>(undefined)
  const error = ref<Error | undefined>(undefined)
  const loading = ref(false)
  const validating = ref(false)

  // Subscribe to SWR changes
  let unsubscribe: (() => void) | undefined

  const updateRefs = (newData: Data | undefined, newError: Error | undefined, newValidating?: boolean, newLoading?: boolean) => {
    data.value = newData
    error.value = newError
    validating.value = newValidating ?? false
    loading.value = newLoading ?? false
  }

  // Watch for key and fetcher changes
  watch([() => key, normalizedFetcher], ([newKey, newFetcher]) => {
    // Cleanup previous subscription
    if (unsubscribe) {
      unsubscribe()
    }

    // Subscribe to new key if available
    if (newKey && newFetcher) {
      const entry = swrRef.value.get(newKey)
      data.value = (entry?.data ?? mergedConfig.value?.fallbackData) as Data | undefined
      error.value = entry?.error as Error | undefined
      validating.value = entry?.isValidating ?? false
      loading.value = entry?.isLoading ?? false
      
      unsubscribe = swrRef.value.subscribe(newKey, updateRefs as any, newFetcher as Fetcher<Data>)
    }
  }, { deep: true, immediate: true })

  // Cleanup on unmount
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  // Create mutate function
  const mutate = computed(() => 
    (mutateData?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: unknown) => {
      if (!key) return Promise.resolve(undefined)
      return swrRef.value.mutate(key, mutateData, options as any)
    }
  )

  // Handle suspense mode
  if (mergedConfig.value?.suspense) {
    if (error.value) {
      throw error.value
    }
    if (data.value === undefined) {
      // In suspense mode, we need to trigger fetch and throw a promise
      const promise = new Promise<Data>((resolve, reject) => {
        const u = swrRef.value.subscribe(key, (d, e) => {
          if (e) {
            reject(e)
          } else if (d !== undefined) {
            resolve(d as Data)
          }
        })
        
        // Start the fetch if not already loading
        const entry = swrRef.value.get(key)
        if (!entry?.isLoading && !entry?.isValidating) {
          swrRef.value.revalidate(key)
        }
        
        return u
      })
      
      throw promise
    }
  }

  return {
    data: data as any,
    error: error as any,
    isLoading: loading,
    isValidating: validating,
    mutate: mutate.value as any,
    revalidate: (options?: unknown) => swrRef.value.revalidate(key, options as any)
  }
}

/**
 * Vue configuration provider component
 */
export const SWRConfig = defineComponent({
  name: 'SWRConfig',
  props: {
    value: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props, { slots }) {
    // Provide configuration to child components
    provide(SWR_CONFIG_KEY, props.value || {})

    return () => slots.default?.()
  }
})

/**
 * Interface type for configuration
 */
export type SWRConfig<Data = unknown, Error = unknown> = SWRConfiguration<Data, Error>

/**
 * Hook for manual mutation
 */
export function useSWRMutate<Data = unknown, Error = unknown>() {
  return computed(() => 
    (key: Key, data?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: unknown) => {
      return globalSWR.mutate(key, data, options as any)
    }
  ).value
}

/**
 * Hook for accessing global SWR instance
 */
export function useSWRInstance() {
  return ref(globalSWR)
}

/**
 * Hook for prefetching data
 */
export function useSWRPrefetch<Data = any, Error = any>() {
  return computed(() => 
    (key: Key, fetcher: Fetcher<Data>) => {
      const normalizedFetcher = fetcher.length === 2 
        ? fetcher
        : (k: Key) => (fetcher as any)(Array.isArray(k) ? k : [k])
      
      return globalSWR.revalidate(key, { dedupe: true })
    }
  ).value
}

export default useSWR
