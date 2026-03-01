import type { SWRConfig as CoreSWRConfig, Key, Fetcher, MutatorOptions, BareFetcher, SWRFetcher } from '../../core'

export interface SWRConfig<Data = unknown, Error = unknown> extends CoreSWRConfig<Data, Error> {
  // React-specific config
  suspense?: boolean
  fallbackData?: Data
  revalidateOnMount?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshWhenHidden?: boolean
  refreshWhenOffline?: boolean
  compare?: (a: Data | undefined, b: Data | undefined) => boolean
}

export interface SWRResponse<Data = unknown, Error = unknown> {
  data: Data | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  loading: boolean
  validating: boolean
  mutate: (data?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: MutatorOptions<Data>) => Promise<Data | undefined>
}

export interface SWRHook<Data = unknown, Error = unknown> extends SWRResponse<Data, Error> {
  // Additional hook-specific properties can be added here
}

// Infinite loading types
export interface SWRInfiniteKeyLoader<Data = any, Args extends any[] = any[]> {
  (index: number, previousPageData: Data | null): Args | null | undefined
}

export interface SWRInfiniteConfig<Data = unknown, Error = unknown> extends Omit<SWRConfig<Data[], Error>, 'compare'> {
  initialSize?: number
  revalidateAll?: boolean
  persistSize?: boolean
  revalidateFirstPage?: boolean
  parallel?: boolean
  compare?: (a: Data[] | undefined, b: Data[] | undefined) => boolean
}

export interface SWRInfiniteResponse<Data = unknown, Error = unknown> {
  data: Data[] | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  loading: boolean
  validating: boolean
  size: number
  setSize: (size: number | ((size: number) => number)) => Promise<Data[][]>
  mutate: (data?: Data[] | Promise<Data[]> | ((currentData?: Data[]) => Data[] | Promise<Data[]>), options?: MutatorOptions<Data[]>) => Promise<Data[] | undefined>
}

// Re-export core types with SWR-compatible names
export type { Key, Fetcher, MutatorOptions, BareFetcher, SWRFetcher } from '../../core'
