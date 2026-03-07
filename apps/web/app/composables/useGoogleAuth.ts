/**
 * Composable for Google Identity Services (GIS) integration.
 * Loads the Google Sign-In SDK and provides a method to render the button.
 */
export function useGoogleAuth() {
  const config = useRuntimeConfig()
  const clientId = config.public.googleClientId as string

  const isAvailable = computed(() => !!clientId)
  const scriptLoaded = ref(false)
  const loading = ref(false)

  /** Load the GIS script tag if not already present. */
  async function loadScript(): Promise<void> {
    if (scriptLoaded.value || window.google?.accounts?.id) {
      scriptLoaded.value = true
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        scriptLoaded.value = true
        resolve()
      }
      script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'))
      document.head.appendChild(script)
    })
  }

  /**
   * Initialize the Google Sign-In SDK and render the button into a container element.
   * @param containerEl - The DOM element to render the button into
   * @param onCredential - Callback that receives the Google ID token (credential)
   */
  async function renderButton(
    containerEl: HTMLElement,
    onCredential: (idToken: string) => void
  ) {
    if (!clientId) return

    loading.value = true
    try {
      await loadScript()

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          onCredential(response.credential)
        },
        context: 'signin',
        use_fedcm_for_prompt: true
      })

      google.accounts.id.renderButton(containerEl, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: '100%'
      })
    } finally {
      loading.value = false
    }
  }

  return {
    isAvailable,
    scriptLoaded,
    loading,
    renderButton
  }
}
