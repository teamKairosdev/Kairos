import { resolve } from 'path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-28',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },

  alias: {
    'db': resolve(rootDir, 'db/index'),
    'db/schema': resolve(rootDir, 'db/schema'),
    'db/index': resolve(rootDir, 'db/index'),
    'shared': resolve(rootDir, 'shared'),
    'shared/types': resolve(rootDir, 'shared/types'),
  },

  // SPA 모드: 인증된 라우트는 모두 클라이언트 사이드 렌더링
  routeRules: {
    '/': { prerender: true },
    '/auth/**': { ssr: false },
    '/dashboard/**': { ssr: false },
    '/resume/**': { ssr: false },
    '/interview/**': { ssr: false },
    '/ats/**': { ssr: false },
    '/humanizer/**': { ssr: false },
    '/qa/**': { ssr: false },
    '/career/**': { ssr: false },
  },

  modules: [
    '@nuxt/ui',
    '@vite-pwa/nuxt',
    '@vueuse/nuxt',
  ],

  css: [
    '~/assets/css/main.css'
  ],

  app: {
    head: {
      title: 'Kairos | AI Job Application Prep & Career Steward',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Kairos - Real-time AI Job Application Prep Platform. Master your interviews, optimize ATS scores, refine resumes, and manage career insights.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN,

    public: {
      appName: 'Kairos',
      appSubtitle: 'AI Job-Application Prep Platform',
    }
  },

  nitro: {
    alias: {
      'db': resolve(rootDir, 'db/index'),
      'db/schema': resolve(rootDir, 'db/schema'),
      'db/index': resolve(rootDir, 'db/index'),
      'shared': resolve(rootDir, 'shared'),
      'shared/types': resolve(rootDir, 'shared/types'),
      'server/services/llm': resolve(rootDir, 'server/services/llm'),
      'server/services/resume': resolve(rootDir, 'server/services/resume'),
      'server/services/interview': resolve(rootDir, 'server/services/interview'),
      'server/services/ats': resolve(rootDir, 'server/services/ats'),
      'server/services/humanizer': resolve(rootDir, 'server/services/humanizer'),
      'server/services/qa': resolve(rootDir, 'server/services/qa'),
      'server/services/career': resolve(rootDir, 'server/services/career'),
      'server/services/parser': resolve(rootDir, 'server/services/parser'),
      'server/services/embedding': resolve(rootDir, 'server/services/embedding'),
    },
    experimental: {
      asyncContext: true,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Kairos - AI Job Prep',
      short_name: 'Kairos',
      description: 'AI Job Application Prep Platform',
      theme_color: '#0f0a1a',
      background_color: '#0f0a1a',
      display: 'standalone',
      icons: [
        { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.destination === 'image',
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 30 },
          },
        },
        {
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
  },
})
