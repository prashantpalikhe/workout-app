<script setup lang="ts">
const emit = defineEmits<{
  started: []
}>()

const open = defineModel<boolean>({ default: false })

const { api } = useApiClient()
const sessionStore = useSessionStore()
const toast = useToast()

interface Assignment {
  id: string
  status: string
  program: { id: string, name: string }
}

const sessionName = ref('')
const selectedAssignmentId = ref<string | null>(null)
const starting = ref(false)
const error = ref<string | null>(null)
const assignments = ref<Assignment[]>([])
const assignmentsLoading = ref(false)

watch(open, async (val) => {
  if (val) {
    sessionName.value = ''
    selectedAssignmentId.value = null
    error.value = null

    // Fetch assignments if not already loaded
    if (assignments.value.length === 0 && !assignmentsLoading.value) {
      assignmentsLoading.value = true
      try {
        const data = await api<Assignment[]>('/sessions/assignments')
        assignments.value = data
      } catch {
        // Non-critical — user can still start freestyle
      } finally {
        assignmentsLoading.value = false
      }
    }
  }
})

watch(selectedAssignmentId, (id) => {
  if (id) {
    const assignment = assignments.value.find(a => a.id === id)
    if (assignment) sessionName.value = assignment.program.name
  } else {
    sessionName.value = ''
  }
})

async function startWorkout() {
  starting.value = true
  error.value = null
  try {
    const selected = selectedAssignmentId.value
    const isOwnProgram = selected?.startsWith('own:')
    await sessionStore.startSession({
      name: sessionName.value.trim() || undefined,
      ...(isOwnProgram
        ? { programId: selected!.slice(4) }
        : { programAssignmentId: selected || undefined })
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

      <div class="space-y-4">
        <UFormField v-if="assignments.length > 0" label="Program">
          <select
            :value="selectedAssignmentId ?? ''"
            class="w-full rounded-md bg-default ring ring-accented text-highlighted px-3 py-2 text-sm focus:outline-primary"
            @change="selectedAssignmentId = ($event.target as HTMLSelectElement).value || null"
          >
            <option value="">
              Freestyle (no program)
            </option>
            <option
              v-for="a in assignments"
              :key="a.id"
              :value="a.id"
            >
              {{ a.program.name }}
            </option>
          </select>
        </UFormField>

        <UFormField label="Workout Name" :hint="selectedAssignmentId ? 'Auto-filled from program' : 'Optional'">
          <UInput
            v-model="sessionName"
            placeholder="e.g. Leg Day, Push Day..."
            autofocus
            @keyup.enter="startWorkout"
          />
        </UFormField>

        <p v-if="!selectedAssignmentId" class="text-xs text-muted">
          Leave blank for "Freestyle Workout"
        </p>
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
          label="Start Workout"
          icon="i-lucide-play"
          :loading="starting"
          @click="startWorkout"
        />
      </div>
    </template>
  </UModal>
</template>
