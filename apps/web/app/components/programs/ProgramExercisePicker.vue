<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>({ default: false })

const { api } = useApiClient()
const programStore = useProgramStore()
const { formatEnum } = useFormatEnum()

const searchQuery = ref('')
const searchResults = ref<Exercise[]>([])
const searchLoading = ref(false)
const adding = ref<string | null>(null)

interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number, limit: number, total: number, totalPages: number }
}

async function searchExercises() {
  searchLoading.value = true
  try {
    const query: Record<string, string | number> = { limit: 20, page: 1 }
    if (searchQuery.value) query.search = searchQuery.value
    const result = await api<PaginatedResponse<Exercise>>('/exercises', { query })
    searchResults.value = result.data
  } finally {
    searchLoading.value = false
  }
}

const addedExerciseIds = computed(() =>
  new Set(programStore.selectedProgram?.exercises.map(e => e.exerciseId) || [])
)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(searchExercises, 300)
})

watch(open, (val) => {
  if (val) {
    searchQuery.value = ''
    searchExercises()
  }
})

async function addExercise(exercise: Exercise) {
  if (!programStore.selectedProgram) return
  adding.value = exercise.id
  try {
    await programStore.addExercise(programStore.selectedProgram.id, {
      exerciseId: exercise.id,
      sortOrder: programStore.selectedProgram.exercises.length,
      targetSets: 3,
      targetReps: '8-12',
      targetTempo: '2-1-1-0'
    })
    emit('success')
    open.value = false
  } finally {
    adding.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add Exercise"
  >
    <template #body>
      <UInput
        v-model="searchQuery"
        placeholder="Search exercises..."
        icon="i-lucide-search"
        class="mb-4"
        autofocus
      />

      <div v-if="searchLoading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else class="space-y-1 max-h-80 overflow-y-auto">
        <div
          v-for="exercise in searchResults"
          :key="exercise.id"
          class="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-elevated"
        >
          <div class="min-w-0 flex-1">
            <span class="font-medium text-sm">{{ exercise.name }}</span>
            <UBadge
              v-if="exercise.equipment"
              variant="subtle"
              size="xs"
              class="ml-2"
            >
              {{ formatEnum(exercise.equipment) }}
            </UBadge>
          </div>

          <UButton
            v-if="addedExerciseIds.has(exercise.id)"
            label="Added"
            size="xs"
            color="neutral"
            variant="ghost"
            disabled
          />
          <UButton
            v-else
            label="Add"
            size="xs"
            icon="i-lucide-plus"
            :loading="adding === exercise.id"
            @click="addExercise(exercise)"
          />
        </div>

        <p
          v-if="searchResults.length === 0"
          class="text-center text-muted py-4"
        >
          No exercises found
        </p>
      </div>
    </template>
  </UModal>
</template>
