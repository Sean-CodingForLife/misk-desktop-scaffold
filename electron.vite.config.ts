import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const shared = resolve(__dirname, 'src/shared')
const renderer = resolve(__dirname, 'src/renderer')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': shared
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': shared
      }
    }
  },
  renderer: {
    root: renderer,
    base: './',
    resolve: {
      alias: {
        '@renderer': resolve(renderer, 'src'),
        '@shared': shared
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: resolve(renderer, 'index.html')
      }
    }
  }
})
