import type { SWRConfig as CoreSWRConfig, Key, Fetcher, MutatorOptions, BareFetcher } from '../../core'
import type { Writable, Readable } from 'svelte/store'

export interface SWRConfig<Data = unknown, Error = unknown> extends CoreSWRConfig<Data, Error> {
  // Svelte-specific config
  store?: boolean
  suspense?: boolean
  fallbackData?: Data
  revalidateOnMount?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshWhenHidden?: boolean
  refreshWhenOffline?: boolean
  compare?: (a: Data | undefined, b: Data | undefined) => boolean
}

export interface SWRStores<Data = unknown, Error = unknown> {
  data: Readable<Data | undefined>
  error: Readable<Error | undefined>
  isLoading: Readable<boolean>
  isValidating: Readable<boolean>
  loading: Readable<boolean>
  validating: Readable<boolean>
  mutate: (data?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<MutatorOptions<Data>>) => Promise<Data | undefined>
}

export interface SWRStore<Data = unknown, Error = unknown> extends Writable<{
  data?: Data
  error?: Error
  isLoading: boolean
  isValidating: boolean
  loading: boolean
  validating: boolean
}> {
  mutate: (data?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<MutatorOptions<Data>>) => Promise<Data | undefined>
}

// Re-export core types
export type { Key, Fetcher, MutatorOptions, BareFetcher, SWRFetcher } from '../../core'
