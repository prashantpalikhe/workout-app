/**
 * # Runtime API Proxy
 *
 * Forwards `/api/**` to the real API server. Reads `apiProxyUrl` from
 * runtimeConfig at request time (overridden by NUXT_API_PROXY_URL at
 * runtime) so the same Docker image works across environments.
 *
 * Why not `nitro.routeRules.proxy`?
 *
 * Route rules are compiled at build time. Any `process.env.*` reference
 * in `nuxt.config.ts` is resolved during `nuxt build` — which means on
 * Railway the target URL would be baked in as localhost:3001 (since the
 * env var isn't set during the build step). This handler reads the
 * runtime config per-request, so the image is portable.
 *
 * Safari ITP: the browser only ever talks to the web origin (same-origin
 * /api/* calls), so the refresh cookie is first-party and survives page
 * reloads even in Safari.
 */
import { proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const { apiProxyUrl } = useRuntimeConfig(event)
  // event.path is `/api/whatever` — strip `/api` prefix before forwarding
  const subPath = event.path.replace(/^\/api/, '') || '/'
  return proxyRequest(event, `${apiProxyUrl}${subPath}`, {
    // Don't follow redirects server-side — forward 3xx responses to the
    // browser. Required for OAuth flows where the API returns 302 → Google's
    // auth page. Without this, h3 fetches Google's HTML itself and returns
    // that, so the browser never navigates.
    fetchOptions: { redirect: 'manual' }
  })
})
