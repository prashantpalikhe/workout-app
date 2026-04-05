<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

const props = defineProps<{
  athleteName: string
  existingExerciseIds: Set<string>
  open: boolean
}>()

const emit = defineEmits<{
  'add': [exerciseId: string]
  'update:open': [value: boolean]
}>()

const { api } = useApiClient()
const { formatEnum } = useFormatEnum()
const _toast = useToast()

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

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

watch(() => props.open, (val) => {
  if (val) {
    searchQuery.value = ''
    searchExercises()
  }
})

function addExercise(exercise: Exercise) {
  adding.value = exercise.id
  emit('add', exercise.id)
  // Parent handles closing after the API call succeeds
}
</script>

<template>
  <UModal
    :open="open"
    :title="`Add Exercise — ${athleteName}`"
    @update:open="emit('update:open', $event)"
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
