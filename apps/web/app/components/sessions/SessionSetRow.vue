<script setup lang="ts">
import { SESSION_SET_TYPES } from '@workout/shared'
import type { SessionSet } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exerciseId: string
  set: SessionSet
  setIndex: number
  trackingType: string
}>()

const sessionStore = useSessionStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()

// Local form state initialized from prop
const form = reactive({
  setType: props.set.setType,
  weight: props.set.weight ?? undefined as number | undefined,
  reps: props.set.reps ?? undefined as number | undefined,
  durationSec: props.set.durationSec ?? undefined as number | undefined,
  distance: props.set.distance ?? undefined as number | undefined,
  rpe: props.set.rpe ?? undefined as number | undefined,
})

// Sync from prop when set data changes externally
watch(() => props.set, (s) => {
  form.setType = s.setType
  form.weight = s.weight ?? undefined
  form.reps = s.reps ?? undefined
  form.durationSec = s.durationSec ?? undefined
  form.distance = s.distance ?? undefined
  form.rpe = s.rpe ?? undefined
}, { deep: true })

// Auto-save on blur
const { saving, error, schedule } = useAutoSave(
  async () => {
    const payload: Record<string, unknown> = {}
    payload.setType = form.setType
    payload.weight = form.weight || undefined
    payload.reps = form.reps || undefined
    payload.durationSec = form.durationSec || undefined
    payload.distance = form.distance || undefined
    payload.rpe = form.rpe || undefined

    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      payload,
    )
  },
  {
    debounceMs: 400,
    onError: () => {
      toast.add({ title: 'Failed to save set', color: 'error' })
    },
  },
)

// Completed checkbox — immediate save (no debounce)
async function toggleCompleted() {
  try {
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      { completed: !props.set.completed },
    )
  } catch {
    toast.add({ title: 'Failed to update set', color: 'error' })
  }
}

async function deleteSet() {
  try {
    await sessionStore.deleteSet(props.sessionId, props.exerciseId, props.set.id)
  } catch {
    toast.add({ title: 'Failed to delete set', color: 'error' })
  }
}

// Set type options for USelect
const setTypeItems = SESSION_SET_TYPES.map(t => ({
  label: formatEnum(t),
  value: t,
}))

function onInputEnter(event: Event) {
  (event.target as HTMLInputElement).blur()
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
const showDistance = computed(() =>
  props.trackingType === 'DISTANCE_DURATION',
)

// Grid class — match the column header grid
const gridClass = computed(() => {
  if (props.trackingType === 'REPS_ONLY' || props.trackingType === 'DURATION') {
    return 'grid-cols-[2.5rem_5rem_1fr_3rem_2rem_2rem]'
  }
  return 'grid-cols-[2.5rem_5rem_1fr_1fr_3rem_2rem_2rem]'
})
</script>

<template>
  <div
    class="grid gap-2 items-center px-1 py-0.5 rounded hover:bg-elevated/50 transition-colors"
    :class="[gridClass, set.completed ? 'opacity-60' : '']"
  >
    <!-- Set number -->
    <span class="text-xs font-medium text-muted text-center">
      {{ setIndex + 1 }}
    </span>

    <!-- Set type -->
    <USelect
      v-model="form.setType"
      :items="setTypeItems"
      size="xs"
      @update:model-value="schedule()"
    />

    <!-- Dynamic data fields based on trackingType -->
    <!-- Field 1: weight or reps or duration or distance -->
    <UInput
      v-if="showWeight"
      v-model.number="form.weight"
      type="number"
      placeholder="0"
      size="xs"
      :step="0.5"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-else-if="showReps && !showWeight"
      v-model.number="form.reps"
      type="number"
      placeholder="0"
      size="xs"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-else-if="showDistance"
      v-model.number="form.distance"
      type="number"
      placeholder="0"
      size="xs"
      :step="0.1"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-else-if="showDuration && !showWeight && !showDistance"
      v-model.number="form.durationSec"
      type="number"
      placeholder="0"
      size="xs"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />

    <!-- Field 2 (only for 2-field tracking types) -->
    <UInput
      v-if="showWeight && showReps"
      v-model.number="form.reps"
      type="number"
      placeholder="0"
      size="xs"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-else-if="showWeight && showDuration"
      v-model.number="form.durationSec"
      type="number"
      placeholder="0"
      size="xs"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />
    <UInput
      v-else-if="showDistance && showDuration"
      v-model.number="form.durationSec"
      type="number"
      placeholder="0"
      size="xs"
      :min="0"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />

    <!-- RPE -->
    <UInput
      v-model.number="form.rpe"
      type="number"
      placeholder="-"
      size="xs"
      :min="1"
      :max="10"
      :step="0.5"
      class="w-12"
      @blur="schedule()"
      @keyup.enter="onInputEnter"
    />

    <!-- Completed checkbox -->
    <button
      class="flex items-center justify-center"
      :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
      @click="toggleCompleted"
    >
      <UIcon
        :name="set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
        class="size-5"
        :class="set.completed ? 'text-success' : 'text-muted'"
      />
    </button>

    <!-- Delete -->
    <button
      class="flex items-center justify-center text-muted hover:text-error transition-colors"
      aria-label="Delete set"
      @click="deleteSet"
    >
      <UIcon name="i-lucide-x" class="size-4" />
    </button>
  </div>
</template>
