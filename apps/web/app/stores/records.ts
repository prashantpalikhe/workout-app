export interface PersonalRecord {
  id: string
  exerciseId: string
  exerciseName: string
  prType: string
  value: number
  achievedOn: string
  sessionSetId: string | null
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

export const useRecordsStore = defineStore('records', () => {
  const { api } = useApiClient()

  // ── State ──
  const records = ref<PersonalRecord[]>([])
  const meta = ref({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const loading = ref(false)

  const exercisePRs = ref<PersonalRecord[]>([])
  const exercisePRsLoading = ref(false)

  // ── Actions ──
  async function fetchRecords(filter: {
    page?: number
    limit?: number
    exerciseId?: string
    prType?: string
  } = {}) {
    loading.value = true
    try {
      const query: Record<string, string | number> = {
        page: filter.page ?? 1,
        limit: filter.limit ?? 20
      }
      if (filter.exerciseId) query.exerciseId = filter.exerciseId
      if (filter.prType) query.prType = filter.prType

      const result = await api<PaginatedResponse<PersonalRecord>>('/records', { query })
      records.value = result.data
      meta.value = result.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchByExercise(exerciseId: string) {
    exercisePRsLoading.value = true
    try {
      exercisePRs.value = await api<PersonalRecord[]>(`/records/exercise/${exerciseId}`)
    } finally {
      exercisePRsLoading.value = false
    }
  }

  function setPage(page: number) {
    fetchRecords({ page, limit: meta.value.limit })
  }

  return {
    records,
    meta,
    loading,
    exercisePRs,
    exercisePRsLoading,
    fetchRecords,
    fetchByExercise,
    setPage
  }
})
