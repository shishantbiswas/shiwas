// Core types
export type {
  Key,
  CacheEntry,
  CacheOptions,
  FetcherOptions,
  Fetcher,
  BareFetcher,
  SWRFetcher,
  MutatorOptions,
  MutatorCallback,
  MutatorValue,
  RevalidateOptions,
  Callback,
  Unsubscribe,
  SWRConfig,
  Cache,
  EventManager,
  SWRCore
} from './types'

// Core implementation
export { SWRCoreImpl, createSWR } from './swr'

// Cache
export { LRUCache, MemoryCache } from './cache'

// Events
export { SWREventManager, KeyEventManager } from './events'

// Key utilities
export { 
  serializeKey, 
  resolveKey, 
  hashKey, 
  areKeysEqual, 
  isValidKey, 
  normalizeKey 
} from './key'

// Configuration
export { defaultConfig, mergeConfig, validateConfig, ConfigManager } from './options'

// Fetcher
export { 
  DeduplicationManager, 
  FetchManager, 
  createFetcher, 
  createFetcherWithErrorHandler 
} from './fetcher'

// Revalidation
export { RevalidationManager, setupGlobalRevalidationHandlers } from './revalidate'

// Mutation
export { 
  MutationManager, 
  createMutator, 
  createMutateFunction, 
  createOptimisticMutation, 
  createAsyncMutation 
} from './mutate'

// Default export
export { createSWR as default } from './swr'
