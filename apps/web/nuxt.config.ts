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

  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  devtools: {
    enabled: true
  },

  app: {
    head: {
      meta: [
        // iOS standalone "add to home screen" — hides browser chrome.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Workout' },
        // viewport-fit=cover lets the UI extend under the notch/home indicator
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo-app.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
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
