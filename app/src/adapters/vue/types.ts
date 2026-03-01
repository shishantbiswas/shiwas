import type { Ref, ComputedRef } from 'vue'
import type { Key, Fetcher, SWRConfig as CoreSWRConfig, MutatorOptions, BareFetcher } from '../../core'

export interface SWRRefs<Data = any, Error = any> {
  data: Ref<Data | undefined>
  error: Ref<Error | undefined>
  isLoading: Ref<boolean>
  isValidating: Ref<boolean>
  mutate: (data?: Data | Promise<Data> | ((currentData?: Data) => Data | Promise<Data>), options?: any) => Promise<Data | undefined>
  revalidate: (options?: any) => Promise<boolean>
}

export interface SWRRef<Data = any, Error = any> extends SWRRefs<Data, Error> {
  // Additional Vue-specific methods can be added here
}

export interface SWRConfig<Data = any, Error = any> extends CoreSWRConfig<Data, Error> {
  // Vue-specific configuration options
  suspense?: boolean
  fallbackData?: Data
  revalidateOnMount?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshWhenHidden?: boolean
  refreshWhenOffline?: boolean
  compare?: (a: Data | undefined, b: Data | undefined) => boolean
}

// Re-export core types with SWR-compatible names
export type { Key, Fetcher, MutatorOptions, BareFetcher, SWRFetcher } from '../../core'
