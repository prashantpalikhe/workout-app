import { effectScope } from 'vue'
import type {
  StartSessionInput,
  CompleteSessionInput,
  AddSessionExerciseInput,
  UpdateSessionExerciseInput,
  CreateSessionSetInput,
  UpdateSessionSetInput,
  ExerciseHistorySession,
  ExerciseHistoryResponse,
} from '@workout/shared'
import type { WorkoutSession, SessionExercise, SessionSet } from '~/stores/sessions'

// ── Types ──

export interface AthleteSlot {
  athleteId: string
  athleteName: string
  session: WorkoutSession | null
  loading: boolean
  error: string | null
  currentExerciseIndex: number
  restTimer: ReturnType<typeof useRestTimer>
  exerciseHistory: Map<string, ExerciseHistorySession[]>
  historyLoading: Set<string>
}

// ── Composable ──

export function useGroupSession() {
  const { api } = useApiClient()

  const slots = ref<AthleteSlot[]>([])
  const initializing = ref(false)

  // effectScope for rest timers created outside the setup scope (inside onMounted → initSlots)
  const timerScope = effectScope()

  // ── Helpers ──

  function basePath(athleteId: string) {
    return `/trainer/athletes/${athleteId}/sessions`
  }

  function getSlot(athleteId: string): AthleteSlot | undefined {
    return slots.value.find((s) => s.athleteId === athleteId)
  }

  function getSlotOrThrow(athleteId: string): AthleteSlot {
    const slot = getSlot(athleteId)
    if (!slot) throw new Error(`No slot for athlete ${athleteId}`)
    return slot
  }

  // ── Initialization ──

  async function initSlots(athletes: Array<{ id: string; name: string }>) {
    initializing.value = true

    // Create slots with rest timers (run inside timerScope so onScopeDispose works)
    slots.value = athletes.map((a) => ({
      athleteId: a.id,
      athleteName: a.name,
      session: null,
      loading: true,
      error: null,
      currentExerciseIndex: 0,
      restTimer: timerScope.run(() => useRestTimer())!,
      exerciseHistory: new Map(),
      historyLoading: new Set(),
    }))

    // Fetch active sessions for all athletes in parallel
    await Promise.allSettled(
      slots.value.map(async (slot) => {
        try {
          const session = await api<WorkoutSession | null>(
            `${basePath(slot.athleteId)}/active`,
          )
          slot.session = session
        } catch {
          slot.error = 'Failed to load session'
        } finally {
          slot.loading = false
        }
      }),
    )

    initializing.value = false
  }

  // ── Session Lifecycle ──

  async function startSession(athleteId: string, input: StartSessionInput) {
    const slot = getSlotOrThrow(athleteId)
    slot.loading = true
    slot.error = null
    try {
      const session = await api<WorkoutSession>(
        `${basePath(athleteId)}/start`,
        { method: 'POST', body: input },
      )
      slot.session = session
      slot.currentExerciseIndex = 0
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      slot.error = fetchError?.data?.message || 'Failed to start session'
      throw err
    } finally {
      slot.loading = false
    }
  }

  async function startAllSessions(input: StartSessionInput) {
    await Promise.allSettled(
      slots.value
        .filter((s) => !s.session && !s.loading)
        .map((slot) => startSession(slot.athleteId, input)),
    )
  }

  async function completeSession(
    athleteId: string,
    input: CompleteSessionInput,
  ) {
    const slot = getSlotOrThrow(athleteId)
    const sessionId = slot.session?.id
    if (!sessionId) return

    await api(`${basePath(athleteId)}/${sessionId}/complete`, {
      method: 'POST',
      body: input,
    })

    slot.restTimer.skip()
    // Remove slot from active list
    slots.value = slots.value.filter((s) => s.athleteId !== athleteId)
  }

  async function abandonSession(athleteId: string) {
    const slot = getSlotOrThrow(athleteId)
    const sessionId = slot.session?.id
    if (!sessionId) return

    await api(`${basePath(athleteId)}/${sessionId}/abandon`, {
      method: 'POST',
    })

    slot.restTimer.skip()
    slots.value = slots.value.filter((s) => s.athleteId !== athleteId)
  }

  // ── Exercise CRUD ──

  async function addExercise(athleteId: string, input: AddSessionExerciseInput) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return

    await api<SessionExercise>(
      `${basePath(athleteId)}/${slot.session.id}/exercises`,
      { method: 'POST', body: input },
    )

    // Refetch full session to get nested data
    const refreshed = await api<WorkoutSession | null>(
      `${basePath(athleteId)}/active`,
    )
    if (refreshed) {
      slot.session = refreshed
      // Navigate to the newly added exercise (last one)
      slot.currentExerciseIndex = refreshed.sessionExercises.length - 1
    }
  }

  async function removeExercise(athleteId: string, exerciseId: string) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return

    await api(
      `${basePath(athleteId)}/${slot.session.id}/exercises/${exerciseId}`,
      { method: 'DELETE' },
    )

    slot.session.sessionExercises = slot.session.sessionExercises.filter(
      (e) => e.id !== exerciseId,
    )

    // Clamp exercise index
    if (slot.currentExerciseIndex >= slot.session.sessionExercises.length) {
      slot.currentExerciseIndex = Math.max(
        0,
        slot.session.sessionExercises.length - 1,
      )
    }
  }

  async function updateExercise(
    athleteId: string,
    exerciseId: string,
    input: UpdateSessionExerciseInput,
  ) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return

    const updated = await api<SessionExercise>(
      `${basePath(athleteId)}/${slot.session.id}/exercises/${exerciseId}`,
      { method: 'PATCH', body: input },
    )

    const idx = slot.session.sessionExercises.findIndex(
      (e) => e.id === exerciseId,
    )
    if (idx !== -1) slot.session.sessionExercises[idx] = updated
  }

  // ── Set CRUD ──

  async function addSet(
    athleteId: string,
    exerciseId: string,
    input: CreateSessionSetInput,
  ) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return

    const exercise = slot.session.sessionExercises.find(
      (e) => e.id === exerciseId,
    )

    const body = {
      setNumber: (exercise?.sets.length ?? 0) + 1,
      setType: 'WORKING' as const,
      completed: false,
      ...input,
    }

    const created = await api<SessionSet>(
      `${basePath(athleteId)}/${slot.session.id}/exercises/${exerciseId}/sets`,
      { method: 'POST', body },
    )

    if (exercise) exercise.sets.push(created)

    return created
  }

  async function updateSet(
    athleteId: string,
    exerciseId: string,
    setId: string,
    input: UpdateSessionSetInput,
  ): Promise<SessionSet | undefined> {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return

    const updated = await api<SessionSet>(
      `${basePath(athleteId)}/${slot.session.id}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'PATCH', body: input },
    )

    const exercise = slot.session.sessionExercises.find(
      (e) => e.id === exerciseId,
    )
    if (exercise) {
      const idx = exercise.sets.findIndex((s) => s.id === setId)
      if (idx !== -1) exercise.sets[idx] = updated
    }

    return updated
  }

  async function deleteSet(
    athleteId: string,
    exerciseId: string,
    setId: string,
  ) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return

    await api(
      `${basePath(athleteId)}/${slot.session.id}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'DELETE' },
    )

    const exercise = slot.session.sessionExercises.find(
      (e) => e.id === exerciseId,
    )
    if (exercise) {
      exercise.sets = exercise.sets.filter((s) => s.id !== setId)
    }
  }

  // ── Exercise Navigation ──

  function currentExercise(athleteId: string): SessionExercise | null {
    const slot = getSlot(athleteId)
    if (!slot?.session?.sessionExercises) return null
    return (
      slot.session.sessionExercises[slot.currentExerciseIndex] ?? null
    )
  }

  function exerciseCount(athleteId: string): number {
    const slot = getSlot(athleteId)
    return slot?.session?.sessionExercises?.length ?? 0
  }

  function nextExercise(athleteId: string) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return
    const max = slot.session.sessionExercises.length - 1
    if (slot.currentExerciseIndex < max) {
      slot.currentExerciseIndex++
    }
  }

  function prevExercise(athleteId: string) {
    const slot = getSlotOrThrow(athleteId)
    if (slot.currentExerciseIndex > 0) {
      slot.currentExerciseIndex--
    }
  }

  function goToExercise(athleteId: string, index: number) {
    const slot = getSlotOrThrow(athleteId)
    if (!slot.session) return
    slot.currentExerciseIndex = Math.max(
      0,
      Math.min(index, slot.session.sessionExercises.length - 1),
    )
  }

  // ── Exercise History ──

  async function fetchExerciseHistory(athleteId: string, exerciseId: string) {
    const slot = getSlotOrThrow(athleteId)

    // Skip if already cached or loading
    if (
      slot.exerciseHistory.has(exerciseId) ||
      slot.historyLoading.has(exerciseId)
    ) {
      return
    }

    slot.historyLoading.add(exerciseId)
    try {
      const result = await api<ExerciseHistoryResponse>(
        `/trainer/athletes/${athleteId}/exercises/${exerciseId}/history`,
        { query: { page: 1, limit: 3 } },
      )
      slot.exerciseHistory.set(exerciseId, result.data)
    } catch {
      // Silently fail — history is non-critical
      slot.exerciseHistory.set(exerciseId, [])
    } finally {
      slot.historyLoading.delete(exerciseId)
    }
  }

  // ── Computed ──

  const activeSlots = computed(() =>
    slots.value.filter((s) => s.session !== null),
  )

  const allDone = computed(() => slots.value.length === 0)

  const needsStart = computed(() =>
    slots.value.some((s) => !s.session && !s.loading),
  )

  // Cleanup all rest timer intervals when the composable's parent scope is disposed
  onScopeDispose(() => {
    timerScope.stop()
  })

  return {
    // State
    slots,
    initializing,

    // Computed
    activeSlots,
    allDone,
    needsStart,

    // Init
    initSlots,

    // Slot access
    getSlot,

    // Session lifecycle
    startSession,
    startAllSessions,
    completeSession,
    abandonSession,

    // Exercise CRUD
    addExercise,
    removeExercise,
    updateExercise,

    // Set CRUD
    addSet,
    updateSet,
    deleteSet,

    // Navigation
    currentExercise,
    exerciseCount,
    nextExercise,
    prevExercise,
    goToExercise,

    // History
    fetchExerciseHistory,
  }
}
