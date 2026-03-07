import type { AuthResponse, RegisterInput } from '@workout/shared'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
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

  async function register(input: Omit<RegisterInput, 'role'>) {
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
    fullName,
    login,
    register,
    logout,
    fetchUser,
    initialize
  }
})
