import type {
  StartSessionInput,
  UpdateSessionInput,
  CompleteSessionInput,
  SessionHistoryFilter,
  AddSessionExerciseInput,
  UpdateSessionExerciseInput,
  CreateSessionSetInput,
  UpdateSessionSetInput
} from '@workout/shared'

// ── Interfaces (mirrors API response shape) ──

export interface SessionSet {
  id: string
  sessionExerciseId: string
  setNumber: number
  setType: string
  weight: number | null
  reps: number | null
  durationSec: number | null
  distance: number | null
  rpe: number | null
  tempo: string | null
  restSec: number | null
  completed: boolean
  notes: string | null
  personalRecord: { id: string; prType: string; value: number } | null
}

export interface SessionExercise {
  id: string
  workoutSessionId: string
  exerciseId: string
  sortOrder: number
  isSubstitution: boolean
  substitutionReason: string | null
  prescribedExerciseId: string | null
  prescribedExercise: { restSec: number | null } | null
  exercise: {
    id: string
    name: string
    equipment: string | null
    trackingType: string
  }
  sets: SessionSet[]
}

export interface WorkoutSession {
  id: string
  athleteId: string
  programAssignmentId: string | null
  name: string
  startedAt: string
  completedAt: string | null
  status: string
  overallRpe: number | null
  notes: string | null
  sessionExercises: SessionExercise[]
  programAssignment: {
    id: string
    programId: string
    program: { id: string; name: string }
  } | null
}

interface PaginatedResponse {
  data: WorkoutSession[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

// ── Store ──

export const useSessionStore = defineStore('sessions', () => {
  const { api } = useApiClient()

  // ── State ──
  const activeSession = ref<WorkoutSession | null>(null)
  const sessions = ref<WorkoutSession[]>([])
  const meta = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const loading = ref(false)
  const activeLoading = ref(false)
  const selectedSession = ref<WorkoutSession | null>(null)
  const detailLoading = ref(false)

  // ── Getters ──
  const hasActiveSession = computed(() => !!activeSession.value)

  // ── Session Lifecycle ──

  async function fetchActive() {
    activeLoading.value = true
    try {
      activeSession.value = await api<WorkoutSession | null>('/sessions/active')
    } finally {
      activeLoading.value = false
    }
  }

  async function startSession(input: StartSessionInput) {
    const session = await api<WorkoutSession>('/sessions/start', {
      method: 'POST',
      body: input
    })
    activeSession.value = session
    return session
  }

  async function updateSession(id: string, input: UpdateSessionInput) {
    const updated = await api<WorkoutSession>(`/sessions/${id}`, {
      method: 'PATCH',
      body: input
    })
    if (activeSession.value?.id === id) activeSession.value = updated
    return updated
  }

  async function completeSession(id: string, input: CompleteSessionInput) {
    const completed = await api<WorkoutSession>(`/sessions/${id}/complete`, {
      method: 'POST',
      body: input
    })
    activeSession.value = null
    return completed
  }

  async function abandonSession(id: string) {
    await api(`/sessions/${id}/abandon`, { method: 'POST' })
    activeSession.value = null
  }

  // ── Session History ──

  async function fetchSessions(filters: Partial<SessionHistoryFilter> = {}) {
    loading.value = true
    try {
      const query: Record<string, string | number> = {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20
      }
      if (filters.status) query.status = filters.status
      if (filters.fromDate) query.fromDate = filters.fromDate
      if (filters.toDate) query.toDate = filters.toDate

      const result = await api<PaginatedResponse>('/sessions', { query })
      sessions.value = result.data
      meta.value = result.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchSessionById(id: string) {
    detailLoading.value = true
    try {
      selectedSession.value = await api<WorkoutSession>(`/sessions/${id}`)
    } finally {
      detailLoading.value = false
    }
  }

  // ── Session Exercises ──

  async function addExercise(
    sessionId: string,
    input: AddSessionExerciseInput
  ) {
    const created = await api<SessionExercise>(
      `/sessions/${sessionId}/exercises`,
      { method: 'POST', body: input }
    )
    // Refetch active session to get full nested data
    if (activeSession.value?.id === sessionId) {
      await fetchActive()
    }
    return created
  }

  async function updateExercise(
    sessionId: string,
    exerciseId: string,
    input: UpdateSessionExerciseInput
  ) {
    const updated = await api<SessionExercise>(
      `/sessions/${sessionId}/exercises/${exerciseId}`,
      { method: 'PATCH', body: input }
    )
    // Update in-place on activeSession
    if (activeSession.value?.id === sessionId) {
      const idx = activeSession.value.sessionExercises.findIndex(
        (e) => e.id === exerciseId
      )
      if (idx !== -1) activeSession.value.sessionExercises[idx] = updated
    }
    return updated
  }

  async function removeExercise(sessionId: string, exerciseId: string) {
    await api(`/sessions/${sessionId}/exercises/${exerciseId}`, {
      method: 'DELETE'
    })
    if (activeSession.value?.id === sessionId) {
      activeSession.value.sessionExercises =
        activeSession.value.sessionExercises.filter((e) => e.id !== exerciseId)
    }
  }

  // ── Session Sets ──

  async function addSet(
    sessionId: string,
    exerciseId: string,
    input: CreateSessionSetInput
  ) {
    const created = await api<SessionSet>(
      `/sessions/${sessionId}/exercises/${exerciseId}/sets`,
      { method: 'POST', body: input }
    )
    // Append to the exercise's sets locally
    if (activeSession.value?.id === sessionId) {
      const exercise = activeSession.value.sessionExercises.find(
        (e) => e.id === exerciseId
      )
      if (exercise) exercise.sets.push(created)
    }
    return created
  }

  async function updateSet(
    sessionId: string,
    exerciseId: string,
    setId: string,
    input: UpdateSessionSetInput
  ) {
    const updated = await api<SessionSet>(
      `/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'PATCH', body: input }
    )
    // Update in-place
    if (activeSession.value?.id === sessionId) {
      const exercise = activeSession.value.sessionExercises.find(
        (e) => e.id === exerciseId
      )
      if (exercise) {
        const idx = exercise.sets.findIndex((s) => s.id === setId)
        if (idx !== -1) exercise.sets[idx] = updated
      }
    }
    return updated
  }

  async function deleteSet(
    sessionId: string,
    exerciseId: string,
    setId: string
  ) {
    await api(`/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`, {
      method: 'DELETE'
    })
    // Remove from local array
    if (activeSession.value?.id === sessionId) {
      const exercise = activeSession.value.sessionExercises.find(
        (e) => e.id === exerciseId
      )
      if (exercise) {
        exercise.sets = exercise.sets.filter((s) => s.id !== setId)
      }
    }
  }

  return {
    // State
    activeSession,
    sessions,
    meta,
    loading,
    activeLoading,
    selectedSession,
    detailLoading,
    // Getters
    hasActiveSession,
    // Session lifecycle
    fetchActive,
    startSession,
    updateSession,
    completeSession,
    abandonSession,
    // History
    fetchSessions,
    fetchSessionById,
    // Exercises
    addExercise,
    updateExercise,
    removeExercise,
    // Sets
    addSet,
    updateSet,
    deleteSet
  }
})
