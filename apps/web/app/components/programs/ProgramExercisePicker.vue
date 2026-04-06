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
const previewExercise = ref<Exercise | null>(null)
const showPreview = ref(false)

function openPreview(exercise: Exercise) {
  previewExercise.value = exercise
  showPreview.value = true
}

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

const ready = ref(false)

watch(open, (val) => {
  if (val) {
    searchQuery.value = ''
    searchResults.value = []
    ready.value = false
  }
})

function onDrawerAnimationEnd() {
  if (open.value && !ready.value) {
    ready.value = true
    searchExercises()
  }
}

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
  <UDrawer
    v-model:open="open"
    :dismissible="true"
    :should-scale-background="true"
    :ui="{ content: 'h-[96%]' }"
    @animation-end="onDrawerAnimationEnd"
  >
    <template #body>
      <div class="flex items-center justify-between gap-4 mb-4">
        <h2 class="font-semibold text-highlighted">
          Add Exercise
        </h2>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="open = false" />
      </div>
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

      <div v-else class="space-y-0.5">
        <div
          v-for="exercise in searchResults"
          :key="exercise.id"
          class="flex items-center gap-3 p-2 rounded-lg"
          :class="addedExerciseIds.has(exercise.id) ? 'opacity-50' : ''"
        >
          <!-- Thumbnail: tap to preview -->
          <button
            type="button"
            class="shrink-0 cursor-pointer"
            @click="openPreview(exercise)"
          >
            <img
              v-if="exercise.imageUrls?.[0]"
              :src="exercise.imageUrls[0]"
              :alt="exercise.name"
              class="size-10 rounded-lg object-cover bg-elevated"
            >
            <div
              v-else
              class="size-10 rounded-lg bg-elevated flex items-center justify-center"
            >
              <UIcon name="i-lucide-dumbbell" class="size-3.5 text-muted" />
            </div>
          </button>
          <!-- Name + equipment: tap to preview -->
          <button
            type="button"
            class="min-w-0 flex-1 text-left cursor-pointer"
            @click="openPreview(exercise)"
          >
            <span class="font-medium text-sm block truncate">{{ exercise.name }}</span>
            <span v-if="exercise.equipment" class="text-xs text-muted">
              {{ formatEnum(exercise.equipment) }}
            </span>
          </button>
          <!-- Add / Added -->
          <UButton
            v-if="addedExerciseIds.has(exercise.id)"
            label="Added"
            icon="i-lucide-check"
            size="xs"
            color="success"
            variant="ghost"
            disabled
          />
          <UButton
            v-else
            label="Add"
            icon="i-lucide-plus"
            size="xs"
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
      <ExercisesExerciseDetailSlideover
        v-model="showPreview"
        :exercise="previewExercise"
        :loading="false"
      />
    </template>
  </UDrawer>
</template>
