/**
 * Composable for PWA service worker lifecycle.
 * Exposes reactive state for the "update available" prompt
 * so the UI can let users choose when to reload.
 */
export function usePwa() {
  const needsRefresh = ref(false)
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

  async function init() {
    // @vite-pwa/nuxt auto-registers the SW; we hook into the update flow.
    // The virtual module is only available in production builds.
    if (import.meta.env.DEV) return

    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        needsRefresh.value = true
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline')
      },
      onRegisteredSW(swUrl, registration) {
        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        }
      }
    })
  }

  function applyUpdate() {
    updateSW?.(true)
  }

  function dismissUpdate() {
    needsRefresh.value = false
  }

  return {
    needsRefresh: readonly(needsRefresh),
    init,
    applyUpdate,
    dismissUpdate
  }
}
