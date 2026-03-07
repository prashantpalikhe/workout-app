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

const emit = defineEmits<{
  'set-completed': [{ setId: string; restSec: number | null }]
}>()

const sessionStore = useSessionStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()

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
const { saving, error, schedule } = useAutoSave(
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
async function toggleCompleted() {
  const wasCompleted = props.set.completed
  try {
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      { completed: !wasCompleted }
    )
    // Emit only when marking a set as complete (not when uncompleting)
    if (!wasCompleted) {
      emit('set-completed', { setId: props.set.id, restSec: props.set.restSec })
    }
  } catch {
    toast.add({ title: 'Failed to update set', color: 'error' })
  }
}

async function deleteSet() {
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

function onInputEnter(event: Event) {
  ;(event.target as HTMLInputElement).blur()
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
    class="rounded-lg p-2 transition-colors"
    :class="set.completed ? 'opacity-50 bg-elevated/30' : 'hover:bg-elevated/50'"
  >
    <!-- Row 1: Set info + actions -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-muted shrink-0 w-6 text-center">
        {{ setIndex + 1 }}
      </span>
      <USelect
        v-model="form.setType"
        :items="setTypeItems"
        size="sm"
        class="flex-1"
        @update:model-value="schedule()"
      />
      <button
        class="flex items-center justify-center size-9 rounded-md transition-colors"
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
      <button
        class="flex items-center justify-center size-9 rounded-md text-muted hover:text-error hover:bg-error/10 transition-colors"
        aria-label="Delete set"
        @click="deleteSet"
      >
        <UIcon name="i-lucide-x" class="size-4" />
      </button>
    </div>

    <!-- Row 2: Data inputs -->
    <div class="flex items-center gap-2 mt-2 pl-8">
      <UInput
        v-if="showWeight"
        v-model.number="form.weight"
        type="number"
        placeholder="Weight"
        size="lg"
        :step="0.5"
        :min="0"
        class="flex-1"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showReps"
        v-model.number="form.reps"
        type="number"
        placeholder="Reps"
        size="lg"
        :min="0"
        class="flex-1"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showDuration"
        v-model.number="form.durationSec"
        type="number"
        placeholder="Dur (s)"
        size="lg"
        :min="0"
        class="flex-1"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showDistance"
        v-model.number="form.distance"
        type="number"
        placeholder="Dist"
        size="lg"
        :step="0.1"
        :min="0"
        class="flex-1"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-model.number="form.rpe"
        type="number"
        placeholder="RPE"
        size="lg"
        :min="1"
        :max="10"
        :step="0.5"
        class="w-16 shrink-0"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
    </div>
  </div>
</template>
