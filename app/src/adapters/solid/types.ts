import type { SWRConfig as CoreSWRConfig, Key, Fetcher, MutatorOptions, BareFetcher } from '../../core'
import type { Accessor, Signal } from 'solid-js'

export interface SWRConfig<Data = unknown, Error = unknown> extends CoreSWRConfig<Data, Error> {
  // Solid-specific config
  signal?: boolean
  suspense?: boolean
  fallbackData?: Data
  revalidateOnMount?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshWhenHidden?: boolean
  refreshWhenOffline?: boolean
  compare?: (a: Data | undefined, b: Data | undefined) => boolean
}

export interface SWRSignals<Data = unknown, Error = unknown> {
  data: Accessor<Data | undefined>
  error: Accessor<Error | undefined>
  isLoading: Accessor<boolean>
  isValidating: Accessor<boolean>
  loading: Accessor<boolean>
  validating: Accessor<boolean>
  mutate: (data?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<MutatorOptions<Data>>) => Promise<Data | undefined>
}

export interface SWRResponse<Data = unknown, Error = unknown> {
  data: Data | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  loading: boolean
  validating: boolean
  mutate: (data?: Data | ((current: Data | undefined) => Data | Promise<Data>), options?: Partial<MutatorOptions<Data>>) => Promise<Data | undefined>
}

// Re-export core types with SWR-compatible names
export type { Key, Fetcher, MutatorOptions, BareFetcher, SWRFetcher } from '../../core'
