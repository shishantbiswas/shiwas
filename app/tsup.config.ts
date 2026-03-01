import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'adapters/react/index': 'src/adapters/react/index.ts',
    'adapters/svelte/index': 'src/adapters/svelte/index.ts',
    'adapters/solid/index': 'src/adapters/solid/index.ts',
    'adapters/vue/index': 'src/adapters/vue/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: {
    entry: {
      index: 'src/index.ts',
      'core/index': 'src/core/index.ts',
      'adapters/react/index': 'src/adapters/react/index.ts',
      'adapters/svelte/index': 'src/adapters/svelte/index.ts',
      'adapters/solid/index': 'src/adapters/solid/index.ts',
      'adapters/vue/index': 'src/adapters/vue/index.ts',
    }
  },
  clean: true,
  external: [
    'react',
    'svelte',
    'solid-js',
    'vue',
    'use-sync-external-store/shim',
    'use-sync-external-store/shim/with-selector'
  ],
  splitting: false,
  sourcemap: true,
  minify: false,
})
