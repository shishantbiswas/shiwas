// Svelte SWR exports
export { default as useSWR, useSWRPrefetch } from './use-swr'

// Re-export core types
export type { Key, Fetcher } from '../../core'

// Main exports
export { createSWRStores, createSWRStore } from './swr'
export { 
  swrDataStore, 
  swrErrorStore, 
  swrLoadingStore, 
  swrValidatingStore,
  useSWRInstance
} from './swr'

// Types
export type { SWRStores, SWRStore, SWRConfig } from './types'

// Default export
export { createSWRStores as default } from './swr'
