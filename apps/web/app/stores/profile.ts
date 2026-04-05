import type {
  UserStatsResponse,
  ChartStatsResponse,
  CalendarStatsResponse
} from '@workout/shared'
import type { WorkoutSession } from '~/stores/sessions'

export interface AthleteProfile {
  id: string
  userId: string
  weight: number | null
  height: number | null
  dateOfBirth: string | null
  unitPreference: string
  gender: string | null
  bio: string | null
  link: string | null
  updatedAt: string
}

export const useProfileStore = defineStore('profile', () => {
  const { api } = useApiClient()

  // ── State ──
  const stats = ref<UserStatsResponse | null>(null)
  const weeklyData = ref<ChartStatsResponse | null>(null)
  const calendarMonths = ref<Record<string, CalendarStatsResponse>>({})
  const profile = ref<AthleteProfile | null>(null)
  const recentSessions = ref<WorkoutSession[]>([])

  const statsLoading = ref(false)
  const weeklyLoading = ref(false)
  const calendarLoading = ref(false)
  const profileLoading = ref(false)

  // ── Actions ──

  async function fetchStats() {
    statsLoading.value = true
    try {
      stats.value = await api<UserStatsResponse>('/users/me/stats')
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchWeeklyStats(
    range: string = '12w',
    metric: string = 'duration'
  ) {
    weeklyLoading.value = true
    try {
      weeklyData.value = await api<ChartStatsResponse>(
        '/users/me/stats/weekly',
        { query: { range, metric } }
      )
    } finally {
      weeklyLoading.value = false
    }
  }

  function calendarKey(month: number, year: number) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  async function fetchCalendarStats(month: number, year: number) {
    calendarLoading.value = true
    try {
      const data = await api<CalendarStatsResponse>(
        '/users/me/stats/calendar',
        { query: { month, year } }
      )
      calendarMonths.value = {
        ...calendarMonths.value,
        [calendarKey(month, year)]: data
      }
    } finally {
      calendarLoading.value = false
    }
  }

  async function fetchProfile() {
    profileLoading.value = true
    try {
      profile.value = await api<AthleteProfile>('/users/me/profile')
    } finally {
      profileLoading.value = false
    }
  }

  async function updateProfile(data: Record<string, unknown>) {
    profile.value = await api<AthleteProfile>('/users/me/profile', {
      method: 'PATCH',
      body: data
    })
  }

  async function updateUser(data: Record<string, unknown>) {
    await api('/users/me', { method: 'PATCH', body: data })
  }

  async function uploadAvatar(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const result = await api<{ avatarUrl: string }>('/users/me/avatar', {
      method: 'POST',
      body: formData
    })
    // Sync auth store so avatar updates everywhere immediately
    const authStore = useAuthStore()
    if (authStore.user) {
      authStore.user.avatarUrl = result.avatarUrl
    }
    return result.avatarUrl
  }

  async function removeAvatar(): Promise<void> {
    await api('/users/me/avatar', { method: 'DELETE' })
    const authStore = useAuthStore()
    if (authStore.user) {
      authStore.user.avatarUrl = null
    }
  }

  async function fetchRecentSessions() {
    const result = await api<{
      data: WorkoutSession[]
      meta: { total: number }
    }>('/sessions', {
      query: { limit: 5, status: 'COMPLETED' }
    })
    recentSessions.value = result.data
  }

  return {
    stats,
    weeklyData,
    calendarMonths,
    profile,
    recentSessions,
    statsLoading,
    weeklyLoading,
    calendarLoading,
    profileLoading,
    fetchStats,
    fetchWeeklyStats,
    fetchCalendarStats,
    fetchProfile,
    updateProfile,
    updateUser,
    uploadAvatar,
    removeAvatar,
    fetchRecentSessions
  }
})
