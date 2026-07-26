import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },

  alias: {
    'db': fileURLToPath(new URL('./db', import.meta.url)),
    'db/*': fileURLToPath(new URL('./db/*', import.meta.url)),
  },

  modules: [
    '@nuxt/ui',
    'nuxt-auth-utils'
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
        { name: 'description', content: 'Kairos - Real-time AI Job Application Prep Platform. Master your interviews, optimize ATS scores, refine resumes, and manage career insights.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap' }
      ]
    }
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/kairos',
    jwtSecret: process.env.JWT_SECRET || 'kairos-super-secret-jwt-key-2026',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || '',
    
    public: {
      appName: 'Kairos',
      appSubtitle: 'AI Job-Application Prep Platform'
    }
  },

  nitro: {
    experimental: {
      asyncContext: true
    }
  }
})
