import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve(root, 'src/renderer/src'),
      '@shared': resolve(root, 'src/shared')
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/shared/keybindings.ts',
        'src/shared/settings/**/*.ts',
        'src/shared/utils.ts',
        'src/main/services/path-guard.ts',
        'src/renderer/src/core/commands/bindings.ts',
        'src/renderer/src/core/commands/registry.ts',
        'src/renderer/src/core/views/registry.ts',
        'src/renderer/src/core/tabs/store.ts',
        'src/renderer/src/core/route/store.ts',
        'src/renderer/src/core/toast/store.ts',
        'src/renderer/src/core/dialog/store.ts',
        'src/renderer/src/core/ui/store.ts',
        'src/renderer/src/modules/tasks/store.ts'
      ],
      exclude: ['**/*.d.ts', '**/types.ts', '**/locales/**'],
      thresholds: {
        lines: 55,
        functions: 50,
        branches: 45,
        statements: 55
      }
    }
  }
})
