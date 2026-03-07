<script setup lang="ts">
const emit = defineEmits<{
  started: []
}>()

const open = defineModel<boolean>({ default: false })

const sessionStore = useSessionStore()
const toast = useToast()

const sessionName = ref('')
const starting = ref(false)
const error = ref<string | null>(null)

watch(open, (val) => {
  if (val) {
    sessionName.value = ''
    error.value = null
  }
})

async function startWorkout() {
  starting.value = true
  error.value = null
  try {
    await sessionStore.startSession({
      name: sessionName.value.trim() || undefined,
    })
    toast.add({ title: 'Workout started!', color: 'success' })
    open.value = false
    emit('started')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to start workout'
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Start Workout"
  >
    <template #body>
      <UAlert
        v-if="error"
        :title="error"
        color="error"
        icon="i-lucide-alert-circle"
        class="mb-4"
      />

      <UFormField label="Workout Name" hint="Optional">
        <UInput
          v-model="sessionName"
          placeholder="e.g. Leg Day, Push Day..."
          autofocus
          @keyup.enter="startWorkout"
        />
      </UFormField>

      <p class="text-xs text-muted mt-2">
        Leave blank for "Freestyle Workout"
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
          label="Start Workout"
          icon="i-lucide-play"
          :loading="starting"
          @click="startWorkout"
        />
      </div>
    </template>
  </UModal>
</template>
