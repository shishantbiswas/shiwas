// Core exports
export * from './core'

// Adapter exports
export * as ReactAdapter from './adapters/react'
export * as SvelteAdapter from './adapters/svelte'
export * as SolidAdapter from './adapters/solid'
export * as VueAdapter from './adapters/vue'

// Default export core
export { createSWR as default } from './core'