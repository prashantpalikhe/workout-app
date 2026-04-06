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
const programStore = useProgramStore()
const router = useRouter()
const toast = useToast()

const starting = ref(false)

onMounted(() => {
  programStore.fetchPrograms()
  programStore.fetchFolders()
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
  const { byFolder, unfiled } = programStore.programsByFolder
  const groups: Array<Array<{ label: string, icon?: string, disabled?: boolean, onSelect?: () => void }>> = []

  // Folder groups
  for (const folder of programStore.folders) {
    const folderPrograms = byFolder.get(folder.id)
    if (!folderPrograms?.length) continue
    groups.push([
      { type: 'label' as const, label: folder.name, icon: 'i-lucide-folder' },
      ...folderPrograms.map(p => ({
        label: p.name,
        icon: 'i-lucide-clipboard-list',
        class: 'pl-7',
        onSelect: () => startWorkout({ programId: p.id, name: p.name })
      }))
    ])
  }

  // Unfiled programs
  if (unfiled.length) {
    groups.push(
      unfiled.map(p => ({
        label: p.name,
        icon: 'i-lucide-clipboard-list',
        onSelect: () => startWorkout({ programId: p.id, name: p.name })
      }))
    )
  }

  // Fallback if no programs
  if (!groups.length) {
    groups.push([{
      label: 'Create a program...',
      icon: 'i-lucide-plus',
      onSelect: () => router.push('/programs')
    }])
  }

  return groups
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
