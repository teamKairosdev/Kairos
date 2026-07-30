import { defineNitroPlugin } from 'nitro/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (event) {
      const url = getRequestURL(event)
      const method = event.method
      console.error(`[${method}] ${url.pathname} — ${error.statusCode || 500} ${error.statusMessage || error.message || 'Unknown error'}`)
    }
  })
})
