import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.output'],
    coverage: {
      provider: 'v8',
      include: ['server/services/**/*.ts', 'server/api/**/*.ts'],
    },
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname),
      '~~': path.resolve(__dirname),
      'server': path.resolve(__dirname, 'server'),
      'db': path.resolve(__dirname, 'db'),
      'shared': path.resolve(__dirname, 'shared'),
    },
  },
})
