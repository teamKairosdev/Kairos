import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import react from '@astrojs/react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  integrations: [
    vue(),
    react(),
  ],
  output: 'static',
  server: { port: 4321 },
  vite: {
    ssr: {
      noExternal: [/@seed-design/],
    },
    resolve: {
      alias: {
        'seed-design': fileURLToPath(new URL('../../seed-design', import.meta.url)),
      },
    },
  },
})
