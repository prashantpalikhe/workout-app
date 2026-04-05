// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/a11y',
    '@nuxt/hints',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxt/scripts'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only — target for the /api proxy handler. Read at request time,
    // so the same Docker image works across environments (overridden by
    // NUXT_API_PROXY_URL at runtime).
    apiProxyUrl: process.env.NUXT_API_PROXY_URL || 'http://localhost:3001/api',
    public: {
      // Browser calls /api/* same-origin; Nitro proxies to apiProxyUrl.
      apiBaseUrl: '/api',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      appleClientId: process.env.NUXT_PUBLIC_APPLE_CLIENT_ID || ''
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
