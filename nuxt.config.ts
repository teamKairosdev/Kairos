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

  features: {
    inlineStyles: false,
  },

  alias: {
    'db': resolve(rootDir, 'db/index'),
    'db/schema': resolve(rootDir, 'db/schema'),
    'db/index': resolve(rootDir, 'db/index'),
    'shared': resolve(rootDir, 'shared'),
    'shared/types': resolve(rootDir, 'shared/types'),
  },

  // SPA & ISR 하이브리드 라우트 룰
  routeRules: {
    '/': { prerender: true },
    '/r/**': { isr: 60, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600' } },
    '/auth/**': { ssr: false },
    '/resume/**': { ssr: false },
    '/interview/**': { ssr: false },
    '/ats/**': { ssr: false },
    '/humanizer/**': { ssr: false },
    '/qa/**': { ssr: false },
    '/career/**': { ssr: false },
    '/studio/**': { ssr: false },
  },

  modules: [
    '@nuxt/ui',
    '@vite-pwa/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
  ],

  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  i18n: {
    locales: [
      { code: 'ko', language: 'ko', name: '한국어', file: 'ko.json' },
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'ko',
    lazy: true,
    langDir: 'locales',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },

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
    // 서버 전용 (클라이언트에 절대 노출 안 됨)
    databaseUrl: process.env.DATABASE_URL,
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    vercelAiGatewayUrl: process.env.VERCEL_AI_GATEWAY_URL,
    vercelAiGatewayKey: process.env.VERCEL_AI_GATEWAY_KEY,
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,

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
      'server/services/llmCache': resolve(rootDir, 'server/services/llmCache'),
      'server/services/hwpParser': resolve(rootDir, 'server/services/hwpParser'),
    },
    publicAssets: [
      {
        dir: resolve(rootDir, 'uploads'),
        baseURL: '/uploads',
        maxAge: 60 * 60 * 24, // 1 day
      },
    ],
    plugins: [
      resolve(rootDir, 'server/plugins/errorHandler.ts'),
    ],
    experimental: {
      asyncContext: true,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    strategies: 'injectManifest',
    srcDir: resolve(rootDir, 'public'),
    filename: 'sw.ts',
    manifest: {
      name: 'Kairos - AI Job Prep',
      short_name: 'Kairos',
      description: 'AI Job Application Prep Platform',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    injectManifest: {
      rollupFormat: 'iife',
    },
    client: {
      installPrompt: true,
    },
  },
})
