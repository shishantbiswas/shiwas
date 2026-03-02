/**
 * Core types for the SWR implementation
 */

export type Key = string | string[] | Record<string, unknown> | null | undefined

export interface CacheEntry<Data = unknown, Error = unknown> {
  data?: Data
  error?: Error
  isValidating: boolean
  isLoading: boolean
  lastModified: number
  ttl?: number
}

export interface CacheOptions {
  ttl?: number
  revalidateOnMount?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshInterval?: number
  dedupingInterval?: number
  errorRetryCount?: number
  errorRetryInterval?: number
  loadingTimeout?: number
}

export interface FetcherOptions {
  signal: AbortSignal
}

export type Fetcher<Data = unknown> = (key: Key, options: FetcherOptions) => Promise<Data>

// Support for simpler fetcher signatures like SWR
export type BareFetcher<Data = unknown> = (...args: unknown[]) => Promise<Data>
export type SWRFetcher<Data = unknown> = BareFetcher<Data> | Fetcher<Data>

export interface MutatorOptions<Data = unknown> {
  revalidate?: boolean
  optimisticData?: Data
  populateCache?: boolean
  rollbackOnError?: boolean
}

export type MutatorCallback<Data = unknown> = (currentData?: Data) => Data | Promise<Data>

export type MutatorValue<Data = unknown> = Data | MutatorCallback<Data> | undefined

export interface RevalidateOptions<Data = unknown> {
  dedupe?: boolean
  retryCount?: number
  fetcher?: Fetcher<Data>
}

export type Callback<Data = unknown, Error = unknown> = (
  data?: Data,
  error?: Error,
  isValidating?: boolean,
  isLoading?: boolean
) => void

export type Unsubscribe = () => void

export interface SWRConfig<Data = unknown, Error = unknown> extends CacheOptions {
  fetcher?: Fetcher<Data>
  onSuccess?: (data: Data, key: Key) => void
  onError?: (error: Error, key: Key) => void
  onErrorRetry?: (error: Error, key: Key, config: SWRConfig<Data, Error>, revalidate: () => void, options: { retryCount: number }) => void
  onLoadingSlow?: (key: Key, config: SWRConfig<Data, Error>) => void
  isPaused?: () => boolean
  compare?: (a: Data | undefined, b: Data | undefined) => boolean
  fallback?: Record<string, Data>
}

export interface Cache<Data = unknown, Error = unknown> {
  get(key: Key): CacheEntry<Data, Error> | undefined
  set(key: Key, value: CacheEntry<Data, Error>): void
  delete(key: Key): void
  clear(): void
  keys(): Key[]
  has(key: Key): boolean
}

export interface EventManager {
  on(event: string, callback: Callback<unknown, unknown>): Unsubscribe
  emit(event: string, ...args: unknown[]): void
  off(event: string, callback: Callback<unknown, unknown>): void
}

export interface SWRCore<Data = unknown, Error = unknown> {
  get(key: Key): CacheEntry<Data, Error> | undefined
  subscribe(key: Key, callback: Callback<Data, Error>, fetcher?: Fetcher<Data>): Unsubscribe
  mutate(key: Key, data?: MutatorValue<Data>, options?: MutatorOptions<Data>): Promise<Data | undefined>
  revalidate(key: Key, options?: RevalidateOptions<Data>): Promise<boolean>
  delete(key: Key): void
  clear(): void
  updateConfig(config: Partial<SWRConfig<Data, Error>>): void
}
