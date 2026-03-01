import { useCallback, useRef, useDebugValue, useMemo, useEffect, useContext, createContext, ReactNode } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import { createSWR } from '../../core'
import type { SWRConfig as SWRConfiguration, SWRResponse, Key, Fetcher, SWRFetcher, BareFetcher } from './types'

// Global SWR instance
const globalSWR = createSWR()

// React Context for configuration
const ConfigContext = createContext<Partial<SWRConfiguration<any, any>>>({})

/**
 * Enhanced useSWR hook that matches the SWR API
 */
export function useSWR<Data = any, Error = any>(
  key: Key | null,
  fetcher?: SWRFetcher<Data> | null,
  config?: Partial<SWRConfiguration<Data, Error>>
): SWRResponse<Data, Error> {
  // Get config from context and props
  const contextConfig = useContext(ConfigContext)
  const mergedConfig = useMemo(() => ({
    ...contextConfig,
    ...config
  }), [contextConfig, config])

  // Create a stable reference to the SWR instance with config
  const swrRef = useRef(globalSWR)
  
  // Update config if changed
  useEffect(() => {
    if (mergedConfig) {
      swrRef.current.updateConfig(mergedConfig as any)
    }
  }, [mergedConfig])

  // Normalize fetcher to handle different signatures
  const normalizedFetcher = useMemo(() => {
    if (!fetcher) return null
    
    // If it's already a core fetcher, use it as-is
    if (fetcher.length === 2) return fetcher as Fetcher<Data>
    
    // Convert bare fetcher to core fetcher
    return (key: Key, options: any) => {
      if (Array.isArray(key)) {
        return (fetcher as BareFetcher<Data>)(...key)
      }
      return (fetcher as BareFetcher<Data>)(key)
    }
  }, [fetcher])

  // Ref to always have the latest fetcher without triggering re-renders or re-subscriptions
  const fetcherRef = useRef(normalizedFetcher)
  useEffect(() => {
    fetcherRef.current = normalizedFetcher
  }, [normalizedFetcher])

  // Create a stable subscribe function
  const subscribe = useCallback((callback: () => void) => {
    if (!key || !fetcherRef.current) return () => {}
    
    return swrRef.current.subscribe(key, () => {
      callback()
    }, fetcherRef.current)
  }, [key]) // Only depend on key
  
  // Cache for the snapshot to avoid infinite loops with useSyncExternalStore
  const lastStateRef = useRef<any>(null)

  // Get current snapshot
  const getSnapshot = useCallback(() => {
    let nextState: any;
    
    if (!key || !fetcherRef.current) {
      nextState = { 
        data: mergedConfig?.fallbackData, 
        error: undefined, 
        isValidating: false, 
        isLoading: false 
      }
    } else {
      const entry = swrRef.current.get(key)
      const data = entry?.data ?? mergedConfig?.fallbackData
      
      nextState = {
        data,
        error: entry?.error,
        isValidating: entry?.isValidating || false,
        isLoading: entry?.isLoading || false
      }
    }

    // Return the cached state if it's deeply equal (or just shallowly equal for these properties)
    if (
      lastStateRef.current &&
      lastStateRef.current.data === nextState.data &&
      lastStateRef.current.error === nextState.error &&
      lastStateRef.current.isValidating === nextState.isValidating &&
      lastStateRef.current.isLoading === nextState.isLoading
    ) {
      return lastStateRef.current
    }

    lastStateRef.current = nextState
    return nextState
  }, [key, mergedConfig?.fallbackData]) // Only depend on key and fallbackData
  
  // Use sync external store for React 18+ compatibility
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  
  // Create mutate function
  const mutate = useCallback(
    (data?: any, options?: any) => {
      if (!key) return Promise.resolve(undefined)
      return swrRef.current.mutate(key, data, options)
    },
    [key]
  )

  // Handle suspense mode
  if (mergedConfig?.suspense) {
    if (state.error) {
      throw state.error
    }
    if (state.data === undefined) {
      // In suspense mode, we need to trigger the fetch and throw a promise
      const promise = new Promise<Data>((resolve, reject) => {
        const unsubscribe = swrRef.current.subscribe(key, (data, error) => {
          if (error) {
            reject(error)
          } else if (data !== undefined) {
            resolve(data)
          }
        })
        
        // Start the fetch if not already loading
        const entry = swrRef.current.get(key)
        if (!entry?.isLoading && !entry?.isValidating) {
          swrRef.current.revalidate(key)
        }
        
        return unsubscribe
      })
      
      throw promise
    }
  }
  
  // Debug value for React DevTools
  useDebugValue(state.data ? `data: ${JSON.stringify(state.data)}` : 'loading')
  
  return {
    ...state,
    loading: state.isLoading,
    validating: state.isValidating,
    mutate
  }
}

/**
 * SWR configuration provider component
 */
export function SWRConfig<Data = any, Error = any>({
  children,
  value
}: {
  children: ReactNode
  value: Partial<SWRConfiguration<Data, Error>>
}) {
  return (
    <ConfigContext.Provider value={value}>
      {children}
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
  return useCallback(
    (key: Key, data?: any, options?: any) => {
      return globalSWR.mutate(key, data, options)
    },
    []
  )
}

/**
 * Hook for accessing the global SWR instance
 */
export function useSWRInstance() {
  return globalSWR
}

/**
 * Hook for prefetching data
 */
export function useSWRPrefetch<Data = any, Error = any>() {
  return useCallback(
    (key: Key, fetcher: SWRFetcher<Data>) => {
      const normalizedFetcher = fetcher.length === 2 
        ? fetcher as Fetcher<Data>
        : (k: Key) => (fetcher as BareFetcher<Data>)(Array.isArray(k) ? k : [k])
      
      return globalSWR.revalidate(key, { dedupe: true })
    },
    []
  )
}

export default useSWR
