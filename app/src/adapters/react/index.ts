// Main exports
// React SWR hooks
export { default as useSWR, SWRConfig, useSWRMutate, useSWRInstance, useSWRPrefetch } from './use-swr'
export { default as useSWRInfinite } from './use-swr-infinite'

// Re-export core types
export type { Key, Fetcher } from '../../core'

export type { SWRResponse, SWRHook } from './types'
