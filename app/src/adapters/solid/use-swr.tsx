import { createSignal, createEffect, onCleanup, Suspense, Show, createContext, useContext, createMemo } from 'solid-js'
import { createSWR } from '../../core'
import type { SWRConfig as SWRConfiguration, SWRResponse, Key, Fetcher, SWRFetcher } from './types'

// Global SWR instance
const globalSWR = createSWR()

// Solid Context for configuration
const ConfigContext = createContext<Partial<SWRConfiguration<any, any>>>({})

/**
 * Enhanced useSWR hook for Solid
 */
export function useSWR<Data = any, Error = any>(
  key: Key | null,
  fetcher?: SWRFetcher<Data> | null,
  config?: Partial<SWRConfiguration<Data, Error>>
): SWRResponse<Data, Error> {
  // Get config from context and props
  const contextConfig = useContext(ConfigContext)
  const mergedConfig = createMemo(() => ({
    ...contextConfig,
    ...config
  }))

  // Create a stable reference to SWR instance with config
  const swrRef = createMemo(() => globalSWR)
  
  // Update config if changed
  createEffect(() => {
    if (mergedConfig) {
      swrRef().updateConfig(mergedConfig as any)
    }
  })

  // Normalize fetcher to handle different signatures
  const normalizedFetcher = createMemo(() => {
    if (!fetcher) return null
    
    // If it's already a core fetcher, use it as-is
    if (fetcher.length === 2) return fetcher
    
    // Convert bare fetcher to core fetcher
    return (k: Key, options: any) => {
      if (Array.isArray(k)) {
        return (fetcher as any)(...k)
      }
      return (fetcher as any)(k)
    }
  })

  // Create signals
  const [data, setData] = createSignal<Data | undefined>(
    key ? swrRef().get(key)?.data ?? mergedConfig()?.fallbackData : mergedConfig()?.fallbackData
  )
  const [error, setError] = createSignal<Error | undefined>(
    key ? swrRef().get(key)?.error : undefined
  )
  const [isLoading, setIsLoading] = createSignal<boolean>(
    key ? swrRef().get(key)?.isLoading ?? false : false
  )
  const [isValidating, setIsValidating] = createSignal<boolean>(
    key ? swrRef().get(key)?.isValidating ?? false : false
  )

  // Subscribe to SWR changes
  let unsubscribe: (() => void) | undefined

  createEffect(() => {
    if (!key || !normalizedFetcher()) return
    
    unsubscribe = swrRef().subscribe(key, (newData: any, newError: any, newIsValidating?: boolean, newIsLoading?: boolean) => {
      setData(newData)
      setError(newError)
      setIsValidating(newIsValidating ?? false)
      setIsLoading(newIsLoading ?? false)
    }, normalizedFetcher() as any)
    
    return unsubscribe
  })

  // Cleanup on destroy
  onCleanup(() => {
    unsubscribe?.()
  })

  // Create mutate function
  const mutate = createMemo(() => 
    (mutateData?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: any) => {
      if (!key) return Promise.resolve(undefined)
      return swrRef().mutate(key, mutateData, options)
    }
  )

  // Handle suspense mode
  if ((mergedConfig as any)?.suspense) {
    if (error()) {
      throw error()
    }
    if (data() === undefined) {
      // In suspense mode, we need to trigger fetch and throw a promise
      const promise = new Promise<Data>((resolve, reject) => {
        const unsubscribe = swrRef().subscribe(key, (data: any, error: any) => {
          if (error) {
            reject(error)
          } else if (data !== undefined) {
            resolve(data)
          }
        })
        
        // Start the fetch if not already loading
        const entry = swrRef().get(key)
        if (!entry?.isLoading && !entry?.isValidating) {
          swrRef().revalidate(key)
        }
        
        return unsubscribe
      })
      
      throw promise
    }
  }

  return {
    get data() { return data() },
    get error() { return error() },
    get isLoading() { return isLoading() },
    get isValidating() { return isValidating() },
    get loading() { return isLoading() },
    get validating() { return isValidating() },
    mutate: mutate()
  }
}

/**
 * Solid configuration provider component
 */
export function SWRConfig<Data = any, Error = any>(props: {
  children: any
  value?: Partial<SWRConfiguration<Data, Error>>
}) {
  return (
    <ConfigContext.Provider value={props.value || {}}>
      {props.children}
    </ConfigContext.Provider>
  )
}

/**
 * Interface type for configuration
 */
export type SWRConfig<Data = any, Error = any> = SWRConfiguration<Data, Error>

/**
 * Hook for manual mutation
 */
export function useSWRMutate<Data = any, Error = any>() {
  return createMemo(() => 
    (key: Key, data?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: any) => {
      return globalSWR.mutate(key, data, options)
    }
  )
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
  return createMemo(() => 
    (key: Key, fetcher: Fetcher<Data>) => {
      const normalizedFetcher = fetcher.length === 2 
        ? fetcher
        : (k: Key) => (fetcher as any)(Array.isArray(k) ? k : [k])
      
      return globalSWR.revalidate(key, { dedupe: true })
    }
  )
}

export default useSWR
