import { useCallback, useDebugValue, useMemo, useState } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim'
import { createSWR } from '../../core'
import type { 
  SWRInfiniteKeyLoader, 
  SWRInfiniteConfig, 
  SWRInfiniteResponse,
  Key,
  Fetcher,
  SWRFetcher,
  BareFetcher
} from './types'

// Global SWR instance for infinite loading
const globalSWR = createSWR()

/**
 * useSWRInfinite hook for infinite loading
 */
export function useSWRInfinite<Data = any, Error = any>(
  getKey: SWRInfiniteKeyLoader<Data> | null,
  fetcher?: SWRFetcher<Data> | null,
  config?: Partial<SWRInfiniteConfig<Data, Error>>
): SWRInfiniteResponse<Data, Error> {
  const [size, setSize] = useState(config?.initialSize || 1)
  
  // Generate all keys for current size
  const keys = useMemo(() => {
    if (!getKey) return []
    
    const keys: Key[] = []
    for (let i = 0; i < size; i++) {
      const previousPageData = i === 0 ? null : (globalSWR.get(keys[i - 1])?.data as Data) || null
      const keyArgs = getKey(i, previousPageData)
      
      if (keyArgs === null || keyArgs === undefined) {
        break
      }
      
      keys.push(keyArgs)
    }
    return keys
  }, [getKey, size])

  // Normalize fetcher
  const normalizedFetcher = useMemo(() => {
    if (!fetcher) return null
    
    if (fetcher.length === 2) return fetcher as Fetcher<Data>
    
    return (key: Key, options: any) => {
      if (Array.isArray(key)) {
        return (fetcher as BareFetcher<Data>)(...key)
      }
      return (fetcher as BareFetcher<Data>)(key)
    }
  }, [fetcher])

  // Get data for all pages
  const data = useMemo(() => {
    if (keys.length === 0) return undefined
    
    const pages: Data[] = []
    for (const key of keys) {
      const entry = globalSWR.get(key)
      if (entry?.data !== undefined) {
        pages.push(entry.data as Data)
      } else {
        // If any page doesn't have data, return undefined
        return undefined
      }
    }
    return pages
  }, [keys])

  // Check loading states
  const isLoading = useMemo(() => {
    if (keys.length === 0) return false
    
    // Check if first page is loading
    const firstEntry = globalSWR.get(keys[0])
    return firstEntry?.isLoading || false
  }, [keys])

  const isValidating = useMemo(() => {
    if (keys.length === 0) return false
    
    // Check if any page is validating
    for (const key of keys) {
      const entry = globalSWR.get(key)
      if (entry?.isValidating) return true
    }
    return false
  }, [keys])

  // Get error from any page
  const error = useMemo(() => {
    if (keys.length === 0) return undefined
    
    for (const key of keys) {
      const entry = globalSWR.get(key)
      if (entry?.error) return entry.error
    }
    return undefined
  }, [keys])

  // Subscribe to all key changes
  const subscribe = useCallback((callback: () => void) => {
    if (keys.length === 0) return () => {}
    
    const unsubscribes = keys.map(key => 
      globalSWR.subscribe(key, callback)
    )
    
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [keys])

  const getSnapshot = useCallback(() => ({
    data,
    error,
    isLoading,
    isValidating
  }), [data, error, isLoading, isValidating])

  // Use sync external store
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Create mutate function for infinite data
  const mutate = useCallback(
    async (mutateData?: any, options?: any) => {
      if (keys.length === 0) return undefined
      
      if (mutateData === undefined) {
        // Revalidate all pages
        const promises = keys.map(key => globalSWR.revalidate(key, options))
        return Promise.all(promises) as any
      }
      
      // Mutate specific page or all pages
      if (typeof mutateData === 'function') {
        // Apply function to all pages
        const currentData = data || []
        const newData = await Promise.all(currentData.map((page, index) => 
          (mutateData as any)(page, index)
        ))
        
        // Update each page
        const promises = keys.map((key, index) => 
          globalSWR.mutate(key, newData[index], options)
        )
        const results = await Promise.all(promises)
        return results[0] as Promise<Data>
      } else if (Array.isArray(mutateData)) {
        // Update specific pages
        const promises = mutateData.map((pageData, index) => 
          keys[index] ? globalSWR.mutate(keys[index], pageData, options) : Promise.resolve(undefined)
        )
        const results = await Promise.all(promises)
        return results[0] as Promise<Data>
      } else {
        // Update first page
        return globalSWR.mutate(keys[0], mutateData, options)
      }
    },
    [keys, data]
  )

  // Create setSize function
  const setSizeFunction = useCallback(
    (newSize: number | ((size: number) => number)) => {
      const targetSize = typeof newSize === 'function' ? newSize(size) : newSize
      
      if (targetSize !== size) {
        setSize(targetSize)
      }
      
      // Return promise that resolves when new pages are loaded
      return new Promise<Data[][]>((resolve) => {
        // This will resolve when the data is updated
        setTimeout(() => {
          if (!getKey) {
            resolve([])
            return
          }
          
          const pages: Data[] = []
          for (let i = 0; i < targetSize; i++) {
            const previousPageData = i === 0 ? null : (globalSWR.get(keys[i - 1])?.data as Data) || null
            const keyArgs = getKey(i, previousPageData)
            
            if (keyArgs === null || keyArgs === undefined) break
            
            const entry = globalSWR.get(keyArgs)
            if (entry?.data) {
              pages.push(entry.data as Data)
            }
          }
          resolve([pages])
        }, 0)
      })
    },
    [size, getKey, keys]
  )

  // Debug value
  useDebugValue(data ? `${data.length} pages` : 'loading')

  return {
    ...state,
    loading: state.isLoading,
    validating: state.isValidating,
    error: state.error as Error,
    size,
    setSize: setSizeFunction,
    mutate
  }
}

export default useSWRInfinite
