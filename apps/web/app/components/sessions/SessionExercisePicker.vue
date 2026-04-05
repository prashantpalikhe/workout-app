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

watch(open, (val) => {
  if (val) {
    searchQuery.value = ''
    searchExercises()
  }
})

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

      <div v-if="searchLoading" class="space-y-3">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
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
            v-if="existingExerciseIds.has(exercise.id)"
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
