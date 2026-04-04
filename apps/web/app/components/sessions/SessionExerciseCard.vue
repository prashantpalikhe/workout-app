<script setup lang="ts">
import type { SessionExercise } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exercise: SessionExercise
}>()

const emit = defineEmits<{
  substitute: []
  remove: []
  'set-completed': [{ setRestSec: number | null, exerciseRestSec: number | null }]
}>()

const sessionStore = useSessionStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()

const addingSet = ref(false)
const showNotes = ref(!!props.exercise.notes)
const notesText = ref(props.exercise.notes ?? '')

const trackingType = computed(() => props.exercise.exercise.trackingType)

// Sync notes from prop
watch(
  () => props.exercise.notes,
  (v) => { notesText.value = v ?? '' },
)

const { schedule: scheduleNoteSave } = useAutoSave(
  async () => {
    await sessionStore.updateExercise(
      props.sessionId,
      props.exercise.id,
      { notes: notesText.value.trim() || undefined },
    )
  },
  { debounceMs: 600 },
)

async function addSet() {
  addingSet.value = true
  try {
    // Prefill from the last set's values
    const lastSet = props.exercise.sets[props.exercise.sets.length - 1]
    await sessionStore.addSet(props.sessionId, props.exercise.id, {
      setNumber: props.exercise.sets.length + 1,
      setType: lastSet?.setType ?? 'WORKING',
      weight: lastSet?.weight ?? undefined,
      reps: lastSet?.reps ?? undefined,
      durationSec: lastSet?.durationSec ?? undefined,
      distance: lastSet?.distance ?? undefined,
      rpe: lastSet?.rpe ?? undefined,
      completed: false,
    })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to add set', color: 'error' })
  } finally {
    addingSet.value = false
  }
}

function onSetCompleted(data: { setId: string, restSec: number | null }) {
  emit('set-completed', {
    setRestSec: data.restSec,
    exerciseRestSec: props.exercise.prescribedExercise?.restSec ?? null
  })
}

// Column headers based on tracking type
const showWeight = computed(() =>
  ['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(trackingType.value)
)
const showReps = computed(() =>
  ['WEIGHT_REPS', 'REPS_ONLY'].includes(trackingType.value)
)
const showDuration = computed(() =>
  ['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(trackingType.value)
)
const showDistance = computed(() => trackingType.value === 'DISTANCE_DURATION')

const dropdownItems = computed(() => [
  [
    {
      label: 'Substitute Exercise',
      icon: 'i-lucide-repeat-2',
      onSelect: () => emit('substitute'),
    },
    {
      label: 'Remove Exercise',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => emit('remove'),
    },
  ],
])
</script>

<template>
  <UCard :ui="{ body: 'p-3 sm:p-4' }">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-sm font-medium truncate sm:text-base">{{ exercise.exercise.name }}</span>
        <UBadge
          v-if="exercise.exercise.equipment"
          variant="subtle"
          size="xs"
        >
          {{ formatEnum(exercise.exercise.equipment) }}
        </UBadge>
        <UBadge
          v-if="exercise.isSubstitution"
          color="warning"
          variant="subtle"
          size="xs"
        >
          Substituted
        </UBadge>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <UButton
          icon="i-lucide-message-square"
          color="neutral"
          :variant="showNotes ? 'soft' : 'ghost'"
          size="xs"
          aria-label="Toggle notes"
          @click="showNotes = !showNotes"
        />
        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="showNotes" class="mb-2">
      <UTextarea
        v-model="notesText"
        placeholder="Add notes for this exercise..."
        :rows="2"
        size="xs"
        @blur="scheduleNoteSave()"
      />
    </div>

    <!-- Column headers -->
    <div v-if="exercise.sets.length" class="flex items-center gap-1 sm:gap-1.5 px-1 pb-1 text-[10px] uppercase tracking-wider text-muted font-medium border-b border-default/50 mb-0.5">
      <span class="w-6 shrink-0 text-center">Set</span>
      <span class="hidden md:block w-24 shrink-0">Type</span>
      <span v-if="showWeight" class="flex-1 min-w-0 text-center">kg</span>
      <span v-if="showReps" class="flex-1 min-w-0 text-center">Reps</span>
      <span v-if="showDuration" class="flex-1 min-w-0 text-center">Sec</span>
      <span v-if="showDistance" class="flex-1 min-w-0 text-center">km</span>
      <span class="w-12 sm:w-14 shrink-0 text-center">RPE</span>
      <span class="w-7 sm:w-8 shrink-0" />
    </div>

    <!-- Set rows -->
    <div>
      <SessionsSessionSetRow
        v-for="(set, index) in exercise.sets"
        :key="set.id"
        :session-id="sessionId"
        :exercise-id="exercise.id"
        :set="set"
        :set-index="index"
        :tracking-type="trackingType"
        @set-completed="onSetCompleted"
      />
    </div>

    <!-- Add set button -->
    <UButton
      label="Add Set"
      icon="i-lucide-plus"
      variant="ghost"
      size="xs"
      class="mt-1.5 w-full"
      :loading="addingSet"
      @click="addSet"
    />
  </UCard>
</template>
