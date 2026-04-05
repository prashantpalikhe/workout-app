import type {
  CreateProgramInput,
  UpdateProgramInput as _UpdateProgramInput,
  CreateProgramExerciseInput,
  UpdateProgramExerciseInput,
  ReorderInput,
  CreateProgramFolderInput
} from '@workout/shared'

export interface ProgramExercise {
  id: string
  programId: string
  exerciseId: string
  sortOrder: number
  targetSets: number | null
  targetReps: string | null
  targetRpe: number | null
  targetTempo: string | null
  restSec: number | null
  notes: string | null
  exercise: {
    id: string
    name: string
    equipment: string | null
    trackingType: string
  }
}

export interface ProgramFolder {
  id: string
  userId: string
  name: string
  sortOrder: number
  createdAt: string
}

export interface Program {
  id: string
  createdById: string
  folderId: string | null
  sourceProgramId: string | null
  assignedById: string | null
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  exercises: ProgramExercise[]
  folder: ProgramFolder | null
  assignedBy: { id: string, firstName: string, lastName: string } | null
}

export const useProgramStore = defineStore('programs', () => {
  const { api } = useApiClient()

  // ── State ──
  const programs = ref<Program[]>([])
  const folders = ref<ProgramFolder[]>([])
  const loading = ref(false)
  const selectedProgram = ref<Program | null>(null)
  const detailLoading = ref(false)

  // ── Getters ──
  const programsByFolder = computed(() => {
    const byFolder = new Map<string, Program[]>()
    const unfiled: Program[] = []
    for (const p of programs.value) {
      if (p.folderId) {
        const list = byFolder.get(p.folderId) || []
        list.push(p)
        byFolder.set(p.folderId, list)
      } else {
        unfiled.push(p)
      }
    }
    return { byFolder, unfiled }
  })

  // ── Program Actions ──
  async function fetchPrograms() {
    loading.value = true
    try {
      programs.value = await api<Program[]>('/programs')
    } finally {
      loading.value = false
    }
  }

  async function fetchProgramById(id: string) {
    detailLoading.value = true
    try {
      selectedProgram.value = await api<Program>(`/programs/${id}`)
    } finally {
      detailLoading.value = false
    }
  }

  async function createProgram(input: CreateProgramInput) {
    const created = await api<Program>('/programs', {
      method: 'POST',
      body: input
    })
    await fetchPrograms()
    useSessionStore().fetchAssignments(true)
    return created
  }

  async function updateProgram(id: string, input: Partial<CreateProgramInput>) {
    const updated = await api<Program>(`/programs/${id}`, {
      method: 'PATCH',
      body: input
    })
    const idx = programs.value.findIndex(p => p.id === id)
    if (idx !== -1) programs.value[idx] = updated
    if (selectedProgram.value?.id === id) selectedProgram.value = updated
    useSessionStore().fetchAssignments(true)
    return updated
  }

  async function deleteProgram(id: string) {
    await api(`/programs/${id}`, { method: 'DELETE' })
    programs.value = programs.value.filter(p => p.id !== id)
    if (selectedProgram.value?.id === id) selectedProgram.value = null
    useSessionStore().fetchAssignments(true)
  }

  // ── Program Exercise Actions ──
  async function addExercise(programId: string, input: CreateProgramExerciseInput) {
    const created = await api<ProgramExercise>(`/programs/${programId}/exercises`, {
      method: 'POST',
      body: input
    })
    // Refetch detail to get the full updated program
    await fetchProgramById(programId)
    return created
  }

  async function updateExercise(
    programId: string,
    exerciseId: string,
    input: Partial<UpdateProgramExerciseInput>
  ) {
    const updated = await api<ProgramExercise>(
      `/programs/${programId}/exercises/${exerciseId}`,
      { method: 'PATCH', body: input }
    )
    if (selectedProgram.value?.id === programId) {
      const idx = selectedProgram.value.exercises.findIndex(e => e.id === exerciseId)
      if (idx !== -1) selectedProgram.value.exercises[idx] = updated
    }
    return updated
  }

  async function removeExercise(programId: string, exerciseId: string) {
    await api(`/programs/${programId}/exercises/${exerciseId}`, { method: 'DELETE' })
    if (selectedProgram.value?.id === programId) {
      selectedProgram.value.exercises = selectedProgram.value.exercises.filter(
        e => e.id !== exerciseId
      )
    }
  }

  async function reorderExercises(programId: string, items: ReorderInput) {
    const updated = await api<Program>(
      `/programs/${programId}/exercises/reorder`,
      { method: 'PATCH', body: items }
    )
    if (selectedProgram.value?.id === programId) {
      selectedProgram.value = updated
    }
    return updated
  }

  // ── Folder Actions ──
  async function fetchFolders() {
    folders.value = await api<ProgramFolder[]>('/program-folders')
  }

  async function createFolder(input: CreateProgramFolderInput) {
    const created = await api<ProgramFolder>('/program-folders', {
      method: 'POST',
      body: input
    })
    await fetchFolders()
    return created
  }

  async function updateFolder(id: string, input: Partial<CreateProgramFolderInput>) {
    const updated = await api<ProgramFolder>(`/program-folders/${id}`, {
      method: 'PATCH',
      body: input
    })
    const idx = folders.value.findIndex(f => f.id === id)
    if (idx !== -1) folders.value[idx] = updated
    return updated
  }

  async function deleteFolder(id: string) {
    await api(`/program-folders/${id}`, { method: 'DELETE' })
    folders.value = folders.value.filter(f => f.id !== id)
    // Programs in deleted folder become unfiled — refetch to reflect
    await fetchPrograms()
  }

  return {
    programs,
    folders,
    loading,
    selectedProgram,
    detailLoading,
    programsByFolder,
    fetchPrograms,
    fetchFolders,
    fetchProgramById,
    createProgram,
    updateProgram,
    deleteProgram,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    createFolder,
    updateFolder,
    deleteFolder
  }
})
