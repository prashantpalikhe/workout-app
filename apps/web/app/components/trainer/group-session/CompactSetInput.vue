<script setup lang="ts">
import type { SessionSet } from '~/stores/sessions'

const props = defineProps<{
  set: SessionSet
  setIndex: number
  trackingType: string
}>()

const emit = defineEmits<{
  update: [data: Record<string, unknown>]
  'toggle-completed': []
  delete: []
}>()

const toast = useToast()

// Local form state initialized from prop
const form = reactive({
  weight: props.set.weight ?? (undefined as number | undefined),
  reps: props.set.reps ?? (undefined as number | undefined),
  durationSec: props.set.durationSec ?? (undefined as number | undefined),
  distance: props.set.distance ?? (undefined as number | undefined),
  rpe: props.set.rpe ?? (undefined as number | undefined),
})

// Sync from prop when set data changes externally
watch(
  () => props.set,
  (s) => {
    form.weight = s.weight ?? undefined
    form.reps = s.reps ?? undefined
    form.durationSec = s.durationSec ?? undefined
    form.distance = s.distance ?? undefined
    form.rpe = s.rpe ?? undefined
  },
  { deep: true },
)

// Auto-save on blur
const { schedule, cancel } = useAutoSave(
  async () => {
    emit('update', {
      weight: form.weight ?? undefined,
      reps: form.reps ?? undefined,
      durationSec: form.durationSec ?? undefined,
      distance: form.distance ?? undefined,
      rpe: form.rpe ?? undefined,
      completed: props.set.completed,
    })
  },
  {
    debounceMs: 400,
    onError: () => {
      toast.add({ title: 'Failed to save set', color: 'error' })
    },
  },
)

function toggleCompleted() {
  cancel()
  emit('toggle-completed')
}

function onInputEnter(event: Event) {
  ;(event.target as HTMLInputElement).blur()
  if (!props.set.completed) {
    toggleCompleted()
  }
}

// Which data inputs to show
const showWeight = computed(() =>
  ['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(props.trackingType),
)
const showReps = computed(() =>
  ['WEIGHT_REPS', 'REPS_ONLY'].includes(props.trackingType),
)
const showDuration = computed(() =>
  ['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(props.trackingType),
)
const showDistance = computed(() => props.trackingType === 'DISTANCE_DURATION')
</script>

<template>
  <div
    class="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
    :class="set.completed ? 'opacity-50 bg-elevated/30' : 'hover:bg-elevated/50'"
  >
    <!-- Set number -->
    <span class="text-xs font-semibold text-muted shrink-0 w-5 text-center">
      {{ setIndex + 1 }}
    </span>

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

    <!-- Complete button -->
    <button
      class="flex items-center justify-center size-7 shrink-0 rounded-md transition-colors"
      :class="set.completed
        ? 'text-success bg-success/10'
        : 'text-muted hover:text-default hover:bg-elevated'"
      :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
      @click="toggleCompleted"
    >
      <UIcon
        :name="set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
        class="size-4"
      />
    </button>

    <!-- Delete button -->
    <button
      class="flex items-center justify-center size-6 shrink-0 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors"
      aria-label="Delete set"
      @click="emit('delete')"
    >
      <UIcon name="i-lucide-x" class="size-3" />
    </button>
  </div>
</template>
