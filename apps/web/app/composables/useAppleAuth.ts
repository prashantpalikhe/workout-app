/**
 * Composable for Apple Sign-In JS SDK integration.
 * Loads the Apple SDK and provides a popup-based sign-in flow.
 */
export function useAppleAuth() {
  const config = useRuntimeConfig()
  const clientId = config.public.appleClientId as string

  const isAvailable = computed(() => !!clientId)
  const scriptLoaded = ref(false)
  const loading = ref(false)

  /** Load the Apple Sign-In JS SDK if not already present. */
  async function loadScript(): Promise<void> {
    if (scriptLoaded.value || window.AppleID) {
      scriptLoaded.value = true
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
      script.async = true
      script.defer = true
      script.onload = () => {
        scriptLoaded.value = true
        resolve()
      }
      script.onerror = () => reject(new Error('Failed to load Apple Sign-In SDK'))
      document.head.appendChild(script)
    })
  }

  /**
   * Prompt the user to sign in with Apple (popup mode).
   * Returns the id_token and optional name (only on first authorization).
   */
  async function promptLogin(): Promise<{
    idToken: string
    firstName?: string
    lastName?: string
  }> {
    if (!clientId) {
      throw new Error('Apple Sign-In is not configured')
    }

    loading.value = true
    try {
      await loadScript()

      AppleID.auth.init({
        clientId,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true
      })

      const response = await AppleID.auth.signIn()

      return {
        idToken: response.authorization.id_token,
        firstName: response.user?.name?.firstName,
        lastName: response.user?.name?.lastName
      }
    } finally {
      loading.value = false
    }
  }

  return {
    isAvailable,
    scriptLoaded,
    loading,
    promptLogin
  }
}
