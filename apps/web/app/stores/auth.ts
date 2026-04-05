import type { AuthResponse, RegisterInput } from '@workout/shared'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isTrainer: boolean
  avatarUrl?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl as string
  const { api, setTokens, clearTokens, getAccessToken } = useApiClient()

  // ── State ─────────────────────────────────────
  const user = ref<AuthUser | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  // ── Getters ───────────────────────────────────
  const isAuthenticated = computed(() => !!user.value && !!getAccessToken())
  const isTrainer = computed(() => !!user.value?.isTrainer)
  const fullName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
  )

  // ── Actions ───────────────────────────────────

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const data = await $fetch<AuthResponse>('/auth/login', {
        baseURL,
        method: 'POST',
        body: { email, password }
      })
      setTokens(data.tokens.accessToken, data.tokens.refreshToken)
      user.value = data.user
      return data
    } finally {
      loading.value = false
    }
  }

  async function register(input: RegisterInput) {
    loading.value = true
    try {
      const data = await $fetch<AuthResponse>('/auth/register', {
        baseURL,
        method: 'POST',
        body: input
      })
      setTokens(data.tokens.accessToken, data.tokens.refreshToken)
      user.value = data.user
      return data
    } finally {
      loading.value = false
    }
  }

  async function loginWithGoogle(idToken: string) {
    loading.value = true
    try {
      const data = await $fetch<AuthResponse>('/auth/oauth/google', {
        baseURL,
        method: 'POST',
        body: { idToken }
      })
      setTokens(data.tokens.accessToken, data.tokens.refreshToken)
      user.value = data.user
      return data
    } finally {
      loading.value = false
    }
  }

  async function loginWithApple(idToken: string, firstName?: string, lastName?: string) {
    loading.value = true
    try {
      const data = await $fetch<AuthResponse>('/auth/oauth/apple', {
        baseURL,
        method: 'POST',
        body: { idToken, firstName, lastName }
      })
      setTokens(data.tokens.accessToken, data.tokens.refreshToken)
      user.value = data.user
      return data
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken }
        })
      } catch {
        // Best-effort — clear local state regardless
      }
    }
    user.value = null
    clearTokens()
    navigateTo('/login')
  }

  async function fetchUser() {
    try {
      const data = await api<AuthUser>('/users/me')
      user.value = data
    } catch {
      user.value = null
      clearTokens()
    }
  }

  /**
   * Force-refresh the JWT tokens so the payload (e.g. isTrainer) is up to date.
   * Also re-fetches the user to keep local state in sync.
   */
  async function refreshSession() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return

    const data = await $fetch<AuthResponse>('/auth/refresh', {
      baseURL,
      method: 'POST',
      body: { refreshToken }
    })
    setTokens(data.tokens.accessToken, data.tokens.refreshToken)
    user.value = data.user
  }

  async function initialize() {
    if (initialized.value) return
    const token = getAccessToken()
    if (token) {
      await fetchUser()
    }
    initialized.value = true
  }

  return {
    user,
    loading,
    initialized,
    isAuthenticated,
    isTrainer,
    fullName,
    login,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    fetchUser,
    refreshSession,
    initialize
  }
})
