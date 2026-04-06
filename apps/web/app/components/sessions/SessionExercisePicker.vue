<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

const props = defineProps<{
  sessionId: string
  existingExerciseIds: Set<string>
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>({ default: false })

const { api } = useApiClient()
const sessionStore = useSessionStore()
const { formatEnum } = useFormatEnum()
const toast = useToast()

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
  adding.value = exercise.id
  try {
    const created = await sessionStore.addExercise(props.sessionId, {
      exerciseId: exercise.id
    })
    // Auto-add the first set so the user can start logging immediately
    await sessionStore.addSet(props.sessionId, created.id, {
      setNumber: 1,
      setType: 'WORKING',
      completed: false
    })
    toast.add({ title: `${exercise.name} added`, color: 'success' })
    emit('success')
    open.value = false
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to add exercise', color: 'error' })
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
      >
        <template v-if="searchQuery" #trailing>
          <UIcon
            name="i-lucide-x"
            class="size-4 cursor-pointer text-muted hover:text-default"
            @click="searchQuery = ''"
          />
        </template>
      </UInput>

      <div v-if="searchLoading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else class="space-y-0.5">
        <button
          v-for="exercise in searchResults"
          :key="exercise.id"
          type="button"
          class="flex items-center gap-3 p-2 rounded-lg w-full text-left transition-colors"
          :class="existingExerciseIds.has(exercise.id) ? 'opacity-50 cursor-default' : 'hover:bg-elevated/50 cursor-pointer'"
          :disabled="existingExerciseIds.has(exercise.id) || adding === exercise.id"
          @click="!existingExerciseIds.has(exercise.id) && addExercise(exercise)"
        >
          <!-- Thumbnail -->
          <div class="shrink-0">
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
          </div>
          <!-- Name + equipment -->
          <div class="min-w-0 flex-1">
            <span class="font-medium text-sm block truncate">{{ exercise.name }}</span>
            <span v-if="exercise.equipment" class="text-xs text-muted">
              {{ formatEnum(exercise.equipment) }}
            </span>
          </div>
          <!-- Loading spinner when adding -->
          <UIcon
            v-if="adding === exercise.id"
            name="i-lucide-loader-2"
            class="size-4 animate-spin text-muted shrink-0"
          />
          <!-- Added indicator -->
          <UIcon
            v-else-if="existingExerciseIds.has(exercise.id)"
            name="i-lucide-check"
            class="size-4 text-success shrink-0"
          />
          <!-- View detail button -->
          <UButton
            v-else
            icon="i-lucide-info"
            size="xs"
            color="neutral"
            variant="ghost"
            @click.stop="openPreview(exercise)"
          />
        </button>

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
