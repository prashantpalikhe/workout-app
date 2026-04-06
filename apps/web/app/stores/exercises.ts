import type {
  CreateExerciseInput,
  UpdateExerciseInput as _UpdateExerciseInput,
  ExerciseStatsResponse,
  ExerciseHistorySession
} from '@workout/shared'

interface MuscleGroup {
  id: string
  name: string
  bodyRegion: string
}

interface ExerciseMuscleGroup {
  id: string
  muscleGroupId: string
  role: 'PRIMARY' | 'SECONDARY'
  muscleGroup: MuscleGroup
}

export interface Exercise {
  id: string
  name: string
  trackingType: string
  equipment: string | null
  movementPattern: string | null
  imageUrls: string[]
  instructions: string[]
  videoUrl: string | null
  isGlobal: boolean
  createdById: string | null
  createdAt: string
  muscleGroups: ExerciseMuscleGroup[]
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

export const useExerciseStore = defineStore('exercises', () => {
  const { api } = useApiClient()

  // ── State ──
  const exercises = ref<Exercise[]>([])
  const meta = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const loading = ref(false)
  const filters = reactive({
    search: '',
    equipment: undefined as string | undefined,
    movementPattern: undefined as string | undefined,
    muscleGroupId: undefined as string | undefined,
    page: 1,
    limit: 20
  })

  const muscleGroups = ref<MuscleGroup[]>([])
  const muscleGroupsLoaded = ref(false)

  const selectedExercise = ref<Exercise | null>(null)
  const detailLoading = ref(false)

  // Exercise detail: stats + history
  const exerciseStats = ref<ExerciseStatsResponse | null>(null)
  const statsLoading = ref(false)
  const exerciseHistory = ref<ExerciseHistorySession[]>([])
  const exerciseHistoryMeta = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const historyLoading = ref(false)

  // ── Getters ──
  const hasActiveFilters = computed(
    () =>
      !!filters.search
      || !!filters.equipment
      || !!filters.movementPattern
      || !!filters.muscleGroupId
  )

  // ── Actions ──
  async function fetchExercises() {
    loading.value = true
    try {
      const query: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit
      }
      if (filters.search) query.search = filters.search
      if (filters.equipment) query.equipment = filters.equipment
      if (filters.movementPattern) query.movementPattern = filters.movementPattern
      if (filters.muscleGroupId) query.muscleGroupId = filters.muscleGroupId

      const result = await api<PaginatedResponse<Exercise>>('/exercises', { query })
      exercises.value = result.data
      meta.value = result.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchMuscleGroups() {
    if (muscleGroupsLoaded.value) return
    const data = await api<MuscleGroup[]>('/muscle-groups')
    muscleGroups.value = data
    muscleGroupsLoaded.value = true
  }

  async function fetchExerciseById(id: string) {
    detailLoading.value = true
    try {
      selectedExercise.value = await api<Exercise>(`/exercises/${id}`)
    } finally {
      detailLoading.value = false
    }
  }

  async function createExercise(input: CreateExerciseInput) {
    const created = await api<Exercise>('/exercises', {
      method: 'POST',
      body: input
    })
    await fetchExercises()
    return created
  }

  async function updateExercise(id: string, input: Partial<CreateExerciseInput>) {
    const updated = await api<Exercise>(`/exercises/${id}`, {
      method: 'PATCH',
      body: input
    })
    const idx = exercises.value.findIndex(e => e.id === id)
    if (idx !== -1) exercises.value[idx] = updated
    if (selectedExercise.value?.id === id) selectedExercise.value = updated
    return updated
  }

  async function deleteExercise(id: string) {
    await api(`/exercises/${id}`, { method: 'DELETE' })
    exercises.value = exercises.value.filter(e => e.id !== id)
    meta.value.total--
    if (selectedExercise.value?.id === id) selectedExercise.value = null
  }

  function setPage(page: number) {
    filters.page = page
    fetchExercises()
  }

  async function fetchExerciseStats(exerciseId: string, range: string = '12w') {
    statsLoading.value = true
    try {
      exerciseStats.value = await api<ExerciseStatsResponse>(
        `/exercises/${exerciseId}/statistics`,
        { query: { range } }
      )
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchExerciseHistory(exerciseId: string, page: number = 1) {
    historyLoading.value = true
    try {
      const result = await api<{
        data: ExerciseHistorySession[]
        meta: { page: number, limit: number, total: number, totalPages: number }
      }>(`/exercises/${exerciseId}/history`, { query: { page, limit: 20 } })
      exerciseHistory.value = result.data
      exerciseHistoryMeta.value = result.meta
    } finally {
      historyLoading.value = false
    }
  }

  function resetFilters() {
    filters.search = ''
    filters.equipment = undefined
    filters.movementPattern = undefined
    filters.muscleGroupId = undefined
    filters.page = 1
    fetchExercises()
  }

  return {
    exercises,
    meta,
    loading,
    filters,
    muscleGroups,
    muscleGroupsLoaded,
    selectedExercise,
    detailLoading,
    hasActiveFilters,
    exerciseStats,
    statsLoading,
    exerciseHistory,
    exerciseHistoryMeta,
    historyLoading,
    fetchExercises,
    fetchMuscleGroups,
    fetchExerciseById,
    fetchExerciseStats,
    fetchExerciseHistory,
    createExercise,
    updateExercise,
    deleteExercise,
    setPage,
    resetFilters
  }
})
