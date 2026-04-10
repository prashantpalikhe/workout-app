/**
 * Thin reader over the user settings bundled in `useAuthStore.user.settings`.
 * The preference now lives on the auth payload (single source of truth), so
 * this composable no longer manages its own fetch or cache.
 */
export function useUserSettings() {
  const authStore = useAuthStore()

  const settings = computed(() => authStore.user?.settings ?? null)
  const restTimerEnabled = computed(() => settings.value?.restTimerEnabled ?? true)
  const defaultRestSec = computed(() => settings.value?.defaultRestSec ?? 90)

  // Kept for API compatibility with existing callers that used to trigger a fetch.
  // Settings come in on /users/me now, so a refresh just re-hydrates the whole user.
  async function fetch() {
    if (authStore.user) return
    await authStore.fetchUser()
  }

  async function refresh() {
    await authStore.fetchUser()
  }

  return {
    settings,
    restTimerEnabled,
    defaultRestSec,
    fetch,
    refresh
  }
}
