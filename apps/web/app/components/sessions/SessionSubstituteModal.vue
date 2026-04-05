<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'
import type { SessionExercise } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exercise: SessionExercise
}>()

const open = defineModel<boolean>({ default: false })

const { api } = useApiClient()
const sessionStore = useSessionStore()
const { formatEnum } = useFormatEnum()
const toast = useToast()

// Two-step flow: 1) Pick exercise, 2) Enter reason
const step = ref<'pick' | 'reason'>('pick')
const selectedExercise = ref<Exercise | null>(null)
const substitutionReason = ref('')
const submitting = ref(false)

// Search state
const searchQuery = ref('')
const searchResults = ref<Exercise[]>([])
const searchLoading = ref(false)

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
    step.value = 'pick'
    selectedExercise.value = null
    substitutionReason.value = ''
    searchQuery.value = ''
    searchExercises()
  }
})

function pickExercise(exercise: Exercise) {
  selectedExercise.value = exercise
  step.value = 'reason'
}

async function confirmSubstitution() {
  if (!selectedExercise.value) return
  submitting.value = true
  try {
    await sessionStore.updateExercise(props.sessionId, props.exercise.id, {
      exerciseId: selectedExercise.value.id,
      substitutionReason: substitutionReason.value.trim() || undefined
    })
    toast.add({
      title: `Substituted with ${selectedExercise.value.name}`,
      color: 'success'
    })
    open.value = false
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to substitute', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="step === 'pick' ? `Substitute: ${exercise.exercise.name}` : 'Substitution Reason'"
  >
    <template #body>
      <!-- Step 1: Pick replacement exercise -->
      <template v-if="step === 'pick'">
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
            v-for="ex in searchResults"
            :key="ex.id"
            class="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-elevated"
          >
            <div class="min-w-0 flex-1">
              <span class="font-medium text-sm">{{ ex.name }}</span>
              <UBadge
                v-if="ex.equipment"
                variant="subtle"
                size="xs"
                class="ml-2"
              >
                {{ formatEnum(ex.equipment) }}
              </UBadge>
            </div>

            <UButton
              v-if="ex.id === exercise.exerciseId"
              label="Current"
              size="xs"
              color="neutral"
              variant="ghost"
              disabled
            />
            <UButton
              v-else
              label="Select"
              size="xs"
              icon="i-lucide-repeat-2"
              @click="pickExercise(ex)"
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

      <!-- Step 2: Reason -->
      <template v-else>
        <p class="text-sm text-muted mb-3">
          Replacing <strong>{{ exercise.exercise.name }}</strong> with
          <strong>{{ selectedExercise?.name }}</strong>
        </p>

        <UFormField label="Reason" hint="Optional">
          <UTextarea
            v-model="substitutionReason"
            placeholder="e.g. Equipment unavailable, injury..."
            :rows="3"
            autofocus
          />
        </UFormField>
      </template>
    </template>

    <template v-if="step === 'reason'" #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Back"
          color="neutral"
          variant="outline"
          @click="step = 'pick'"
        />
        <UButton
          label="Confirm Substitution"
          icon="i-lucide-repeat-2"
          :loading="submitting"
          @click="confirmSubstitution"
        />
      </div>
    </template>
  </UModal>
</template>
