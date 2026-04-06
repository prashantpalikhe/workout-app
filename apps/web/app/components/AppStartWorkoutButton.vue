<script setup lang="ts">
/**
 * Start-workout button with optional program picker.
 *
 * - Main click starts a freestyle workout and navigates to the active session.
 * - When the user has program assignments, a chevron dropdown exposes them.
 * - When no programs exist, renders a plain button with the same main action.
 *
 * Usage:
 *   <AppStartWorkoutButton />
 *   <AppStartWorkoutButton label="Start Workout" icon="i-lucide-play" />
 */
withDefaults(defineProps<{
  label?: string
  icon?: string
  block?: boolean
  dropdownSide?: 'top' | 'bottom'
}>(), {
  label: 'Start',
  icon: 'i-lucide-play',
  block: false,
  dropdownSide: 'bottom'
})

const emit = defineEmits<{
  started: []
}>()

const sessionStore = useSessionStore()
const router = useRouter()
const toast = useToast()

const starting = ref(false)

onMounted(() => {
  sessionStore.fetchAssignments()
})

async function startWorkout(opts: { assignmentId?: string, programId?: string, name?: string } = {}) {
  if (starting.value) return
  starting.value = true
  try {
    await sessionStore.startSession({
      name: opts.name,
      programAssignmentId: opts.assignmentId,
      programId: opts.programId
    })
    emit('started')
    router.push('/sessions/active')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to start workout',
      color: 'error'
    })
  } finally {
    starting.value = false
  }
}

const programMenuItems = computed(() => {
  if (!sessionStore.assignments.length) {
    return [[
      {
        label: 'Create a program...',
        icon: 'i-lucide-plus',
        onSelect: () => router.push('/programs')
      }
    ]]
  }
  return [
    sessionStore.assignments.map(a => ({
      label: a.program.name,
      icon: 'i-lucide-clipboard-list',
      onSelect: () => {
        const id = a.id
        if (id.startsWith('own:')) {
          startWorkout({ programId: id.slice(4), name: a.program.name })
        } else {
          startWorkout({ assignmentId: id, name: a.program.name })
        }
      }
    }))
  ]
})
</script>

<template>
  <UFieldGroup :class="block ? 'w-full' : ''">
    <UButton
      :label="label"
      :icon="icon"
      :loading="starting"
      :class="block ? 'flex-1' : ''"
      @click="startWorkout()"
    />
    <UDropdownMenu :items="programMenuItems" :content="{ align: 'end', side: dropdownSide }">
      <UButton
        :icon="dropdownSide === 'top' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        aria-label="Start from program"
      />
    </UDropdownMenu>
  </UFieldGroup>
</template>
