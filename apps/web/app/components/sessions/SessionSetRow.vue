<script setup lang="ts">
import { SESSION_SET_TYPES } from '@workout/shared'
import type { SessionSet } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exerciseId: string
  globalExerciseId: string
  set: SessionSet
  setIndex: number
  trackingType: string
}>()

const emit = defineEmits<{
  'set-completed': [{ setId: string; restSec: number | null }]
}>()

const sessionStore = useSessionStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()

const prResult = ref<{ type: string; label: string }[] | null>(null)

// Local form state initialized from prop
const form = reactive({
  setType: props.set.setType,
  weight: props.set.weight ?? (undefined as number | undefined),
  reps: props.set.reps ?? (undefined as number | undefined),
  durationSec: props.set.durationSec ?? (undefined as number | undefined),
  distance: props.set.distance ?? (undefined as number | undefined),
  rpe: props.set.rpe ?? (undefined as number | undefined)
})

// Sync from prop when set data changes externally
watch(
  () => props.set,
  (s) => {
    form.setType = s.setType
    form.weight = s.weight ?? undefined
    form.reps = s.reps ?? undefined
    form.durationSec = s.durationSec ?? undefined
    form.distance = s.distance ?? undefined
    form.rpe = s.rpe ?? undefined
  },
  { deep: true }
)

// Auto-save on blur
const { saving, error, schedule, cancel } = useAutoSave(
  async () => {
    const payload: Record<string, unknown> = {}
    payload.setType = form.setType
    payload.weight = form.weight || undefined
    payload.reps = form.reps || undefined
    payload.durationSec = form.durationSec || undefined
    payload.distance = form.distance || undefined
    payload.rpe = form.rpe || undefined
    // Always include completed so a delayed autosave doesn't overwrite a recent checkmark
    payload.completed = props.set.completed

    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      payload
    )
  },
  {
    debounceMs: 400,
    onError: () => {
      toast.add({ title: 'Failed to save set', color: 'error' })
    }
  }
)

// Completed checkbox — immediate save (no debounce)
// Includes all current form data so a pending auto-save can't race with it
async function toggleCompleted() {
  const wasCompleted = props.set.completed
  // Cancel any pending debounced auto-save — we'll include all form data here
  cancel()
  try {
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      {
        setType: form.setType,
        weight: form.weight || undefined,
        reps: form.reps || undefined,
        durationSec: form.durationSec || undefined,
        distance: form.distance || undefined,
        rpe: form.rpe || undefined,
        completed: !wasCompleted,
      }
    )
    // Emit only when marking a set as complete (not when uncompleting)
    if (!wasCompleted) {
      emit('set-completed', { setId: props.set.id, restSec: props.set.restSec })

      // Check for PRs in the background
      sessionStore.checkPR(props.globalExerciseId, {
        weight: form.weight || undefined,
        reps: form.reps || undefined,
        durationSec: form.durationSec || undefined,
        distance: form.distance || undefined,
      }).then((result) => {
        if (result.isPR) {
          prResult.value = result.prTypes
          const labels = result.prTypes.map(p => p.label).join(', ')
          toast.add({
            title: 'New Personal Record!',
            description: labels,
            color: 'warning',
            icon: 'i-lucide-trophy',
          })
        }
      }).catch(() => {})
    } else {
      prResult.value = null
    }
  } catch {
    toast.add({ title: 'Failed to update set', color: 'error' })
  }
}

async function deleteSet() {
  cancel()
  try {
    await sessionStore.deleteSet(
      props.sessionId,
      props.exerciseId,
      props.set.id
    )
  } catch {
    toast.add({ title: 'Failed to delete set', color: 'error' })
  }
}

// Set type options for USelect
const setTypeItems = SESSION_SET_TYPES.map((t) => ({
  label: formatEnum(t),
  value: t
}))

// Dropdown items for set number (set type + delete)
const setDropdownItems = computed(() => [
  SESSION_SET_TYPES.map((t) => ({
    label: formatEnum(t),
    icon: form.setType === t ? 'i-lucide-check' : undefined,
    onSelect: () => {
      form.setType = t
      schedule()
    },
  })),
  [{
    label: 'Delete Set',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => deleteSet(),
  }],
])

function onInputEnter(event: Event) {
  ;(event.target as HTMLInputElement).blur()
  if (!props.set.completed) {
    toggleCompleted()
  }
}

// Which data inputs to show
const showWeight = computed(() =>
  ['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(props.trackingType)
)
const showReps = computed(() =>
  ['WEIGHT_REPS', 'REPS_ONLY'].includes(props.trackingType)
)
const showDuration = computed(() =>
  ['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(
    props.trackingType
  )
)
const showDistance = computed(() => props.trackingType === 'DISTANCE_DURATION')
</script>

<template>
  <div
    class="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
    :class="set.completed ? 'opacity-50 bg-elevated/30' : 'hover:bg-elevated/50'"
  >
    <!-- Set number (tap for set type + delete) -->
    <UDropdownMenu :items="setDropdownItems" :content="{ align: 'start' as const }">
      <button class="text-xs font-semibold text-muted shrink-0 w-5 text-center hover:text-default transition-colors">
        {{ setIndex + 1 }}
      </button>
    </UDropdownMenu>

    <!-- Set type (hidden on mobile) -->
    <USelect
      v-model="form.setType"
      :items="setTypeItems"
      size="xs"
      class="hidden md:block w-24 shrink-0"
      @update:model-value="schedule()"
    />

    <!-- Data inputs -->
    <UInput
      v-if="showWeight"
      v-model.number="form.weight"
      type="number"
      placeholder="kg"
      size="xs"
      :step="0.5"
      :min="0"
      class="flex-1 min-w-0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-if="showReps"
      v-model.number="form.reps"
      type="number"
      placeholder="Reps"
      size="xs"
      :min="0"
      class="flex-1 min-w-0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-if="showDuration"
      v-model.number="form.durationSec"
      type="number"
      placeholder="Sec"
      size="xs"
      :min="0"
      class="flex-1 min-w-0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-if="showDistance"
      v-model.number="form.distance"
      type="number"
      placeholder="km"
      size="xs"
      :step="0.1"
      :min="0"
      class="flex-1 min-w-0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-model.number="form.rpe"
      type="number"
      placeholder="RPE"
      size="xs"
      :min="1"
      :max="10"
      :step="0.5"
      class="w-14 shrink-0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />

    <!-- Complete button -->
    <button
      class="flex items-center justify-center size-8 shrink-0 rounded-md transition-colors"
      :class="set.completed
        ? 'text-success bg-success/10'
        : 'text-muted hover:text-default hover:bg-elevated'"
      :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
      @click="toggleCompleted"
    >
      <UIcon
        :name="set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
        class="size-5"
      />
    </button>

    <!-- PR icon -->
    <UIcon
      v-if="prResult"
      name="i-lucide-trophy"
      class="size-4 shrink-0 text-warning"
    />
  </div>
</template>
