import type { AuthResponse } from '@workout/shared'

// Module-level refresh lock — shared across all useApiClient() calls.
// Ensures only ONE refresh request runs at a time, even when
// multiple concurrent requests fail with 401 simultaneously.
let refreshPromise: Promise<void> | null = null

export function useApiClient() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl as string

  function getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  function getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token')
  }

  function setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  function clearTokens() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  async function refreshAccessToken(): Promise<void> {
    if (refreshPromise) return refreshPromise

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      throw new Error('No refresh token available')
    }

    refreshPromise = $fetch<AuthResponse>('/auth/refresh', {
      baseURL,
      method: 'POST',
      body: { refreshToken }
    })
      .then((data) => {
        setTokens(data.tokens.accessToken, data.tokens.refreshToken)
      })
      .catch((error) => {
        clearTokens()
        navigateTo('/login')
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })

    return refreshPromise
  }

  async function api<T>(
    url: string,
    options: Parameters<typeof $fetch>[1] = {}
  ): Promise<T> {
    const accessToken = getAccessToken()

    const fetchOptions: Parameters<typeof $fetch>[1] = {
      ...options,
      baseURL,
      headers: {
        ...options.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      }
    }

    try {
      return await $fetch<T>(url, fetchOptions)
    } catch (error: unknown) {
      const fetchError = error as { response?: { status?: number } }

      if (fetchError?.response?.status === 401 && getRefreshToken()) {
        try {
          await refreshAccessToken()
        } catch {
          throw error
        }

        // Retry with new token
        const newAccessToken = getAccessToken()
        return await $fetch<T>(url, {
          ...options,
          baseURL,
          headers: {
            ...options.headers,
            ...(newAccessToken ? { Authorization: `Bearer ${newAccessToken}` } : {})
          }
        })
      }

      throw error
    }
  }

  return {
    api,
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens
  }
}
