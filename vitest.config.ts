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
      include: ['src/server/**/*.ts', 'src/app/api/**/*.ts'],
    },
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: [
      { find: /^@\/db(?=\/|$)/, replacement: path.resolve(__dirname, 'db') },
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
      { find: /^db(?=\/|$)/, replacement: path.resolve(__dirname, 'db') },
      { find: /^shared(?=\/|$)/, replacement: path.resolve(__dirname, 'shared') },
    ],
  },
})
