<script setup lang="ts">
import type { WorkoutSession } from '~/stores/sessions'

const props = defineProps<{
  session: WorkoutSession
}>()

const emit = defineEmits<{
  abandoned: []
}>()

const open = defineModel<boolean>({ default: false })

const sessionStore = useSessionStore()
const router = useRouter()
const toast = useToast()

const abandoning = ref(false)

async function confirmAbandon() {
  abandoning.value = true
  try {
    await sessionStore.abandonSession(props.session.id)
    toast.add({ title: 'Workout abandoned', color: 'neutral' })
    open.value = false
    emit('abandoned')
    // Navigate directly since parent may have unmounted this component
    router.push('/sessions')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to abandon workout', color: 'error' })
  } finally {
    abandoning.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Abandon Workout?"
  >
    <template #body>
      <p class="text-sm text-muted">
        Are you sure you want to abandon <strong>{{ session.name }}</strong>?
        Your logged sets will be saved but the session will be marked as abandoned.
      </p>
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
          label="Abandon"
          icon="i-lucide-x-circle"
          color="error"
          :loading="abandoning"
          @click="confirmAbandon"
        />
      </div>
    </template>
  </UModal>
</template>
