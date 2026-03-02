import type { SWRConfig, Fetcher } from './types'

/**
 * Default configuration for SWR
 */
export const defaultConfig: SWRConfig = {
  // Cache options
  ttl: 0, // No TTL by default
  revalidateOnMount: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 0,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 3000,

  // Callbacks
  onSuccess: () => {},
  onError: () => {},
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    if (retryCount >= Math.max(config.errorRetryCount || 0, 0)) return
    
    const timeout = ~~((Math.random() + 0.5) * (1 << (retryCount < 8 ? retryCount : 8))) * (config.errorRetryInterval || 0)
    
    setTimeout(revalidate, timeout)
  },
  onLoadingSlow: () => {},

  // Utilities
  isPaused: () => false,
  compare: (a, b) => a === b,
  fallback: {}
}

/**
 * Merge user configuration with defaults
 */
export function mergeConfig<Data = any, Error = any>(
  userConfig?: Partial<SWRConfig<Data, Error>>
): SWRConfig<Data, Error> {
  if (!userConfig) return defaultConfig as SWRConfig<Data, Error>
  
  return {
    ...defaultConfig,
    ...userConfig,
    // Ensure arrays and objects are properly merged
    fallback: { ...defaultConfig.fallback, ...userConfig.fallback } as Record<string, Data>
  } as SWRConfig<Data, Error>
}

/**
 * Validate configuration
 */
export function validateConfig<Data = any, Error = any>(
  config: SWRConfig<Data, Error>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validate fetcher
  if (config.fetcher && typeof config.fetcher !== 'function') {
    errors.push('fetcher must be a function')
  }
  
  // Validate numeric options
  const numericFields = [
    'ttl',
    'refreshInterval', 
    'dedupingInterval',
    'errorRetryCount',
    'errorRetryInterval',
    'loadingTimeout'
  ] as const
  
  for (const field of numericFields) {
    const value = config[field]
    if (value !== undefined && (typeof value !== 'number' || value < 0)) {
      errors.push(`${field} must be a non-negative number`)
    }
  }
  
  // Validate boolean options
  const booleanFields = [
    'revalidateOnFocus',
    'revalidateOnReconnect'
  ] as const
  
  for (const field of booleanFields) {
    const value = config[field]
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push(`${field} must be a boolean`)
    }
  }
  
  // Validate callbacks
  const callbackFields = [
    'onSuccess',
    'onError', 
    'onErrorRetry',
    'onLoadingSlow',
    'isPaused',
    'compare'
  ] as const
  
  for (const field of callbackFields) {
    const value = config[field]
    if (value !== undefined && typeof value !== 'function') {
      errors.push(`${field} must be a function`)
    }
  }
  
  // Validate fallback
  if (config.fallback && typeof config.fallback !== 'object') {
    errors.push('fallback must be an object')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Create a configuration manager
 */
export class ConfigManager<Data = any, Error = any> {
  private config: SWRConfig<Data, Error>
  
  constructor(userConfig?: Partial<SWRConfig<Data, Error>>) {
    const merged = mergeConfig(userConfig)
    const validation = validateConfig(merged)
    
    if (!validation.valid) {
      console.warn('Invalid SWR configuration:', validation.errors)
    }
    
    this.config = merged
  }
  
  get(): SWRConfig<Data, Error> {
    return this.config
  }
  
  update(updates: Partial<SWRConfig<Data, Error>>): void {
    this.config = { ...this.config, ...updates }
    
    const validation = validateConfig(this.config)
    if (!validation.valid) {
      console.warn('Invalid SWR configuration update:', validation.errors)
    }
  }
  
  setFetcher(fetcher: Fetcher<Data>): void {
    this.config.fetcher = fetcher
  }
  
  getFetcher(): Fetcher<Data> | undefined {
    return this.config.fetcher
  }
  
  isPaused(): boolean {
    return !!this.config.isPaused?.()
  }
  
  shouldRevalidateOnFocus(): boolean {
    return !!(this.config.revalidateOnFocus && !this.isPaused())
  }
  
  shouldRevalidateOnReconnect(): boolean {
    return !!(this.config.revalidateOnReconnect && !this.isPaused())
  }
  
  getRefreshInterval(): number {
    return this.config.refreshInterval || 0
  }
  
  getDedupingInterval(): number {
    return this.config.dedupingInterval || 2000
  }
  
  getErrorRetryCount(): number {
    return this.config.errorRetryCount || 3
  }
  
  getErrorRetryInterval(): number {
    return this.config.errorRetryInterval || 5000
  }
  
  getLoadingTimeout(): number {
    return this.config.loadingTimeout || 3000
  }
  
  getFallbackData(key: string): Data | undefined {
    return this.config.fallback?.[key]
  }
}
