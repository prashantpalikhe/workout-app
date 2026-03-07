interface UserSettings {
  restTimerEnabled: boolean
  defaultRestSec: number
  theme: string
}

const _settings = ref<UserSettings | null>(null)
const _fetched = ref(false)

/**
 * Composable to fetch and cache user settings.
 * Fetches once from GET /users/me/settings and caches globally.
 */
export function useUserSettings() {
  const { api } = useApiClient()

  const settings = computed(() => _settings.value)
  const restTimerEnabled = computed(() => _settings.value?.restTimerEnabled ?? true)
  const defaultRestSec = computed(() => _settings.value?.defaultRestSec ?? 90)

  async function fetch() {
    if (_fetched.value) return
    try {
      _settings.value = await api<UserSettings>('/users/me/settings')
    } catch {
      // Use defaults if fetch fails
    } finally {
      _fetched.value = true
    }
  }

  /** Force re-fetch (e.g. after settings page saves). */
  async function refresh() {
    _fetched.value = false
    await fetch()
  }

  return {
    settings,
    restTimerEnabled,
    defaultRestSec,
    fetch,
    refresh
  }
}
