interface TrainerInvite {
  id: string
  token: string
  url: string
  expiresAt: string
  createdAt: string
}

interface AthleteListItem {
  id: string
  status: string
  startedAt: string
  endedAt: string | null
  athlete: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
}

interface AthleteProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  profile: {
    weight: number | null
    height: number | null
    dateOfBirth: string | null
    unitPreference: string
    gender: string | null
    bio: string | null
  } | null
}

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const useTrainerStore = defineStore('trainer', () => {
  const { api } = useApiClient()

  // ── State ─────────────────────────────────────
  const athletes = ref<AthleteListItem[]>([])
  const athletesMeta = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const athletesLoading = ref(false)
  const athleteProfile = ref<AthleteProfile | null>(null)

  const invites = ref<TrainerInvite[]>([])
  const invitesLoading = ref(false)

  // ── Invite Actions ────────────────────────────

  async function createInvite(expiresInHours = 168) {
    const data = await api<TrainerInvite>('/trainer/invites', {
      method: 'POST',
      body: { expiresInHours },
    })
    invites.value.unshift(data)
    return data
  }

  async function fetchInvites() {
    invitesLoading.value = true
    try {
      invites.value = await api<TrainerInvite[]>('/trainer/invites')
    } finally {
      invitesLoading.value = false
    }
  }

  async function revokeInvite(inviteId: string) {
    await api(`/trainer/invites/${inviteId}`, { method: 'DELETE' })
    invites.value = invites.value.filter((i) => i.id !== inviteId)
  }

  // ── Athlete Actions ───────────────────────────

  async function fetchAthletes(filters: { status?: string; page?: number; limit?: number } = {}) {
    athletesLoading.value = true
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.limit) params.set('limit', String(filters.limit))

      const query = params.toString()
      const url = `/trainer/athletes${query ? `?${query}` : ''}`
      const response = await api<PaginatedResponse<AthleteListItem>>(url)

      athletes.value = response.data
      athletesMeta.value = response.meta
    } finally {
      athletesLoading.value = false
    }
  }

  async function fetchAthleteProfile(athleteId: string) {
    athleteProfile.value = await api<AthleteProfile>(
      `/trainer/athletes/${athleteId}/profile`,
    )
    return athleteProfile.value
  }

  async function updateRelationship(relationshipId: string, status: string) {
    await api(`/trainer/athletes/${relationshipId}`, {
      method: 'PATCH',
      body: { status },
    })
    // Refresh the list
    await fetchAthletes()
  }

  return {
    // State
    athletes,
    athletesMeta,
    athletesLoading,
    athleteProfile,
    invites,
    invitesLoading,

    // Actions
    createInvite,
    fetchInvites,
    revokeInvite,
    fetchAthletes,
    fetchAthleteProfile,
    updateRelationship,
  }
})
