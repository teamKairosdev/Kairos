import { defineNitroPlugin } from 'nitro/runtime'

const IGNORED_PATHS = ['/__nuxt_error', '/_nuxt/']

function isIgnored(pathname: string): boolean {
  return IGNORED_PATHS.some((p) => pathname.startsWith(p))
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (!event) return
    const url = getRequestURL(event)
    const pathname = url.pathname
    const method = event.method
    const statusCode = error.statusCode || 500
    const statusMessage = error.statusMessage || error.message || 'Unknown error'

    if (isIgnored(pathname) && statusCode === 404) return

    console.error(`[${method}] ${pathname} — ${statusCode} ${statusMessage}`)
  })
})
