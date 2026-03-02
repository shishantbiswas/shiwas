import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import solid from 'vite-plugin-solid'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    react() as any,
    solid() as any,
    vue() as any
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    server: {
      deps: {
        inline: [/solid-js/],
      },
    }
  },
})
