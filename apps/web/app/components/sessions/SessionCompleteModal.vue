<script setup lang="ts">
import type { WorkoutSession } from '~/stores/sessions'

const props = defineProps<{
  session: WorkoutSession
}>()

const emit = defineEmits<{
  completed: [sessionId: string]
}>()

const open = defineModel<boolean>({ default: false })

const router = useRouter()
const toast = useToast()

const sessionStore = useSessionStore()

const overallRpe = ref<number | undefined>(undefined)
const notes = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

// Long session warning (> 3 hours)
const LONG_SESSION_MS = 3 * 60 * 60 * 1000
const isLongSession = ref(false)
const endTime = ref('')
const endTimeChanged = ref(false)

function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${mo}-${d}T${h}:${min}`
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours === 0) return `${minutes} minutes`
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
}

const durationText = ref('')
const showWarning = computed(() => isLongSession.value && !sessionStore.isTrainerMode)
const minEndTime = computed(() => toLocalDatetimeString(new Date(props.session.startedAt)))
const maxEndTime = ref('')

watch(open, (val) => {
  if (val) {
    overallRpe.value = undefined
    notes.value = ''
    error.value = null

    const durationMs = Date.now() - new Date(props.session.startedAt).getTime()
    isLongSession.value = durationMs > LONG_SESSION_MS
    const now = new Date()
    endTime.value = toLocalDatetimeString(now)
    maxEndTime.value = toLocalDatetimeString(now)
    endTimeChanged.value = false
    durationText.value = formatDuration(durationMs)
  }
})

const exerciseCount = computed(() => props.session.sessionExercises.length)
const totalSets = computed(() =>
  props.session.sessionExercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
)

async function completeWorkout() {
  submitting.value = true
  error.value = null
  // Capture the session id before the store clears activeSession,
  // which would unmount this component via the parent's v-if guard.
  const sessionId = props.session.id
  try {
    const input: Record<string, unknown> = {
      overallRpe: overallRpe.value,
      notes: notes.value.trim() || undefined,
    }
    if (showWarning.value && endTimeChanged.value) {
      const endDate = new Date(endTime.value)
      const startDate = new Date(props.session.startedAt)
      if (endDate < startDate) {
        error.value = 'End time cannot be before the workout started'
        submitting.value = false
        return
      }
      if (endDate > new Date()) {
        error.value = 'End time cannot be in the future'
        submitting.value = false
        return
      }
      input.completedAt = endDate.toISOString()
    }
    await sessionStore.completeSession(sessionId, input as any)
    toast.add({ title: 'Workout completed!', color: 'success' })
    open.value = false
    emit('completed', sessionId)
    // Navigate directly since parent may have unmounted this component
    if (sessionStore.isTrainerMode) {
      router.push(`/trainer/athletes/${sessionStore.trainerAthleteId}`)
    } else {
      router.push(`/sessions/${sessionId}`)
    }
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to complete workout'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Complete Workout"
  >
    <template #body>
      <UAlert
        v-if="error"
        :title="error"
        color="error"
        icon="i-lucide-alert-circle"
        class="mb-4"
      />

      <!-- Long session warning -->
      <UAlert
        v-if="showWarning"
        color="warning"
        icon="i-lucide-clock"
        class="mb-4"
      >
        <template #title>
          This workout has been running for {{ durationText }}.
        </template>
        <template #description>
          Did you forget to finish? You can adjust the end time below.
        </template>
      </UAlert>

      <!-- Summary -->
      <div class="flex gap-4 mb-4 text-sm text-muted">
        <span>{{ exerciseCount }} exercise{{ exerciseCount !== 1 ? 's' : '' }}</span>
        <span>{{ totalSets }} completed set{{ totalSets !== 1 ? 's' : '' }}</span>
      </div>

      <div class="space-y-4">
        <UFormField v-if="showWarning" label="End time">
          <input
            v-model="endTime"
            type="datetime-local"
            :min="minEndTime"
            :max="maxEndTime"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            @change="endTimeChanged = true"
          >
        </UFormField>

        <UFormField label="Overall RPE" hint="1-10">
          <UInput
            v-model.number="overallRpe"
            type="number"
            placeholder="How hard was this workout?"
            :min="1"
            :max="10"
            :step="0.5"
          />
        </UFormField>

        <UFormField label="Notes">
          <UTextarea
            v-model="notes"
            placeholder="Any notes about this session..."
            :rows="3"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
        <UButton
          label="Complete Workout"
          icon="i-lucide-check-circle"
          color="success"
          :loading="submitting"
          @click="completeWorkout"
        />
      </div>
    </template>
  </UModal>
</template>
