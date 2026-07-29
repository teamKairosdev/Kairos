import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import react from '@astrojs/react'

export default defineConfig({
  integrations: [
    vue({ appEntrypoint: '/src/app' }),
    react(),
  ],
  output: 'hybrid',
  server: { port: 4321 },
})
