# Shiwas - Framework-Agnostic SWR Library (Under development)

A modern, framework-agnostic Stale-While-Revalidate (SWR) data fetching library with adapters for React, Svelte, Solid, and Vue.

## 🚀 Features

### Core Library (`@shiwas/core`)
- **Framework-agnostic**: Core logic separated from framework-specific code
- **Advanced Caching**: LRU cache with TTL support
- **Request Deduplication**: Prevent duplicate requests automatically
- **Event System**: Subscribe to state changes
- **Mutation Support**: Optimistic updates with rollback
- **Revalidation Strategies**: Focus, reconnect, interval-based
- **TypeScript**: Full type safety throughout
- **Error Handling**: Comprehensive error management with retry logic

### Framework Adapters
- **React** (`@shiwas/react`): Hooks-based API with `useSyncExternalStore`
- **Svelte** (`@shiwas/svelte`): Store-based API with Svelte reactivity
- **Solid** (`@shiwas/solid`): Signal-based API with Solid reactivity
- **Vue** (`@shiwas/vue`): Composable API with Vue 3 reactivity

## 📦 Installation

### Core Library
```bash
npm install @shiwas/core
```

### Framework Adapters
```bash
# React
npm install @shiwas/react

# Svelte
npm install @shiwas/svelte

# Solid
npm install @shiwas/solid

# Vue
npm install @shiwas/vue
```

## 🎯 Quick Start

### Core Usage
```typescript
import { createSWR } from '@shiwas/core'

const swr = createSWR({
  fetcher: (key) => fetch(key).then(res => res.json()),
  refreshInterval: 5000,
  revalidateOnFocus: true
})

// Subscribe to changes
const unsubscribe = swr.subscribe('/api/user', (data, error, isValidating, isLoading) => {
  console.log('Data:', data)
  console.log('Loading:', isLoading)
})

// Manual mutation
await swr.mutate('/api/user', { name: 'New Name' })
```

### React Adapter
```tsx
import useSWR from '@shiwas/react'

function UserProfile() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/user',
    (key) => fetch(key).then(res => res.json())
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => mutate({ name: 'Updated Name' })}>
        Update Name
      </button>
    </div>
  )
}
```

### Svelte Adapter
```svelte
<script>
  import { createSWRStores } from '@shiwas/svelte'
  
  const { data, error, isLoading, mutate } = createSWRStores(
    '/api/user',
    (key) => fetch(key).then(res => res.json())
  )
</script>

{#if $isLoading}
  <div>Loading...</div>
{:else if $error}
  <div>Error: {$error.message}</div>
{:else}
  <div>
    <h1>{$data?.name}</h1>
    <button on:click={() => mutate({ name: 'Updated Name' })}>
      Update Name
    </button>
  </div>
{/if}
```

### Solid Adapter
```tsx
import { createSWRSignals } from '@shiwas/solid'

function UserProfile() {
  const { data, error, isLoading, mutate } = createSWRSignals(
    '/api/user',
    (key) => fetch(key).then(res => res.json())
  )

  return (
    <div>
      <Show when={isLoading()}>
        <div>Loading...</div>
      </Show>
      <Show when={error()}>
        <div>Error: {error()?.message}</div>
      </Show>
      <Show when={data()}>
        <div>
          <h1>{data()?.name}</h1>
          <button onClick={() => mutate({ name: 'Updated Name' })}>
            Update Name
          </button>
        </div>
      </Show>
    </div>
  )
}
```

### Vue Adapter
```vue
<template>
  <div>
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <h1>{{ data?.name }}</h1>
      <button @click="updateName">Update Name</button>
    </div>
  </div>
</template>

<script setup>
import { useSWR } from '@shiwas/vue'

const { data, error, isLoading, mutate } = useSWR(
  '/api/user',
  (key) => fetch(key).then(res => res.json())
)

const updateName = () => {
  mutate({ name: 'Updated Name' })
}
</script>
```

## 🏗️ Architecture

### Core Components
- **Cache**: LRU cache with TTL and automatic cleanup
- **Events**: Key-specific and global event management
- **Fetcher**: Request deduplication and abort support
- **Revalidation**: Multiple revalidation strategies
- **Mutation**: Optimistic updates with rollback
- **Configuration**: Extensible configuration system

### Adapter Pattern
Each adapter:
1. Imports the core library
2. Provides framework-specific reactivity integration
3. Exports idiomatic API for the framework
4. Handles framework lifecycle management

## 📚 API Reference

### Core API
```typescript
interface SWRCore<Data, Error> {
  get(key: Key): CacheEntry<Data, Error> | undefined
  subscribe(key: Key, callback: Callback): Unsubscribe
  mutate(key: Key, data?, options?): Promise<Data>
  revalidate(key: Key, options?): Promise<boolean>
  delete(key: Key): void
  clear(): void
}
```

### Configuration Options
```typescript
interface SWRConfig<Data, Error> {
  fetcher?: Fetcher<Data>
  ttl?: number
  refreshInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  dedupingInterval?: number
  errorRetryCount?: number
  errorRetryInterval?: number
  loadingTimeout?: number
  onSuccess?: (data: Data, key: Key) => void
  onError?: (error: Error, key: Key) => void
  onErrorRetry?: (error, key, config, revalidate, options) => void
  isPaused?: () => boolean
  compare?: (a: Data, b: Data) => boolean
  fallback?: Record<string, Data>
}
```

## 🧪 Development

### Setup
```bash
# Clone repository
git clone <repository-url>
cd shiwas

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start development
npm run dev
```

### Project Structure
```
shiwas/
├── src/
│   ├── core/                 # Core SWR library
│   └── adapters/            # Framework adapters
│       ├── react/            # React adapter
│       ├── svelte/           # Svelte adapter
│       ├── solid/            # Solid adapter
│       └── vue/              # Vue adapter
├── package.json              # Workspace configuration
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT © [Shiwas](https://github.com/shiwas)

## 🙏 Acknowledgments

Inspired by:
- [SWR](https://swr.vercel.app/) - React Hooks library for data fetching
- [swrev](https://github.com/erikflowers/swrev) - Framework-agnostic SWR implementation
- [solid-swr](https://github.com/tronikelis/solid-swr) - Solid implementation
- [sswr](https://github.com/ConsoleTVs/sswr) - Svelte implementation
- [swrv](https://github.com/Kong/swrv) - Vue implementation
