import {
  createSignal,
  createEffect,
  onCleanup,
  batch
} from 'solid-js'
import { createSWR } from '../../core'
import type { SWRSignals, SWRResponse, Key, Fetcher, MutatorOptions } from './types'

// Global SWR instance
const globalSWR = createSWR()

/**
 * Create SWR signals for Solid
 */
export function createSWRSignals<Data = unknown, Error = unknown>(
  key: Key | null,
  fetcher?: Fetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
): SWRSignals<Data, Error> {
  // Update config if provided
  if (config) {
    globalSWR.updateConfig(config)
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
    } else {
      initialData = config?.fallbackData
    }
  }

  // Create signals
  const [data, setData] = createSignal<Data | undefined>(initialData)
  const [error, setError] = createSignal<Error | undefined>(initialError)
  const [isLoading, setIsLoading] = createSignal<boolean>(initialIsLoading)
  const [isValidating, setIsValidating] = createSignal<boolean>(initialIsValidating)

  // Subscribe to SWR changes
  let unsubscribe: (() => void) | undefined

  if (key) {
    unsubscribe = globalSWR.subscribe(key, (newData, newError, newIsValidating, newIsLoading) => {
      batch(() => {
        setData(newData)
        setError(newError)
        setIsValidating(newIsValidating ?? false)
        setIsLoading(newIsLoading ?? false)
      })
    })
  }

  // Cleanup on destroy
  onCleanup(() => {
    unsubscribe?.()
  })

  // Create mutate function
  const mutate = (mutateData?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<MutatorOptions<Data>>) => {
    if (!key) return Promise.resolve(undefined)
    return globalSWR.mutate(key, mutateData, options)
  }

  return {
    data,
    error,
    isLoading,
    isValidating,
    loading: isLoading,
    validating: isValidating,
    mutate
  }
}

/**
 * Create SWR response object for Solid
 */
export function createSWRResponse<Data = unknown, Error = unknown>(
  key: Key | null,
  fetcher?: Fetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
): SWRResponse<Data, Error> {
  const signals = createSWRSignals<Data, Error>(key, fetcher, config)
  
  return {
    get data() { return signals.data() },
    get error() { return signals.error() },
    get isLoading() { return signals.isLoading() },
    get isValidating() { return signals.isValidating() },
    get loading() { return signals.isLoading() },
    get validating() { return signals.isValidating() },
    mutate: signals.mutate
  }
}

/**
 * Hook-like function returning array [data, { mutate, error, isLoading, isValidating }]
 */
export function useSWR<Data = unknown, Error = unknown>(
  key: Key | null,
  fetcher?: Fetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
): [Data | undefined, SWRResponse<Data, Error>] {
  const signals = createSWRSignals<Data, Error>(key, fetcher, config)
  
  const response: SWRResponse<Data, Error> = {
    get data() { return signals.data() },
    get error() { return signals.error() },
    get isLoading() { return signals.isLoading() },
    get isValidating() { return signals.isValidating() },
    get loading() { return signals.isLoading() },
    get validating() { return signals.isValidating() },
    mutate: signals.mutate
  }
  
  return [signals.data(), response]
}

/**
 * Individual signal creators
 */
export function swrDataSignal<Data = unknown>(
  key: Key | null,
  fetcher?: Fetcher<Data>,
  config?: Partial<import('./types').SWRConfig<Data, Error>>
) {
  return createSWRSignals<Data, unknown>(key, fetcher, config as any).data
}

export function swrErrorSignal<Error = unknown>(
  key: Key | null,
  fetcher?: Fetcher<any>,
  config?: Partial<import('./types').SWRConfig<any, Error>>
) {
  return createSWRSignals<any, Error>(key, fetcher, config).error
}

export function swrLoadingSignal(
  key: Key | null,
  fetcher?: Fetcher<any>,
  config?: Partial<import('./types').SWRConfig<any, any>>
) {
  return createSWRSignals<any, any>(key, fetcher, config).isLoading
}

export function swrValidatingSignal(
  key: Key | null,
  fetcher?: Fetcher<any>,
  config?: Partial<import('./types').SWRConfig<any, any>>
) {
  return createSWRSignals<any, any>(key, fetcher, config).isValidating
}

/**
 * Hook for manual mutation
 */
export function useSWRMutate<Data = unknown, Error = unknown>() {
  return (key: Key, data?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<MutatorOptions<Data>>) => {
    return globalSWR.mutate(key, data, options)
  }
}

/**
 * Hook for accessing global SWR instance
 */
export function useSWRInstance() {
  return globalSWR
}

export default createSWRSignals
