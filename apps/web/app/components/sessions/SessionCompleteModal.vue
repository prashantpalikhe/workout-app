<script setup lang="ts">
import type { WorkoutSession } from '~/stores/sessions'

const props = defineProps<{
  session: WorkoutSession
}>()

const emit = defineEmits<{
  completed: [sessionId: string]
}>()

const open = defineModel<boolean>({ default: false })

const sessionStore = useSessionStore()
const router = useRouter()
const toast = useToast()

const overallRpe = ref<number | undefined>(undefined)
const notes = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)

watch(open, (val) => {
  if (val) {
    overallRpe.value = undefined
    notes.value = ''
    error.value = null
  }
})

const exerciseCount = computed(() => props.session.sessionExercises.length)
const totalSets = computed(() =>
  props.session.sessionExercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0),
)

async function completeWorkout() {
  submitting.value = true
  error.value = null
  // Capture the session id before the store clears activeSession,
  // which would unmount this component via the parent's v-if guard.
  const sessionId = props.session.id
  try {
    await sessionStore.completeSession(sessionId, {
      overallRpe: overallRpe.value,
      notes: notes.value.trim() || undefined,
    })
    toast.add({ title: 'Workout completed!', color: 'success' })
    open.value = false
    emit('completed', sessionId)
    // Navigate directly since parent may have unmounted this component
    router.push(`/sessions/${sessionId}`)
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

      <!-- Summary -->
      <div class="flex gap-4 mb-4 text-sm text-muted">
        <span>{{ exerciseCount }} exercise{{ exerciseCount !== 1 ? 's' : '' }}</span>
        <span>{{ totalSets }} completed set{{ totalSets !== 1 ? 's' : '' }}</span>
      </div>

      <div class="space-y-4">
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
