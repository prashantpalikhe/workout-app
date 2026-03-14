<script setup lang="ts">
import type { AthleteSlot } from '~/composables/useGroupSession'
import type { SessionExercise } from '~/stores/sessions'

const props = defineProps<{
  slot: AthleteSlot
  currentExercise: SessionExercise | null
  exerciseIndex: number
  exerciseCount: number
}>()

const emit = defineEmits<{
  'add-set': [exerciseId: string]
  'update-set': [exerciseId: string, setId: string, data: Record<string, unknown>]
  'toggle-set-completed': [exerciseId: string, setId: string]
  'delete-set': [exerciseId: string, setId: string]
  'add-exercise': []
  'remove-exercise': [exerciseId: string]
  'update-exercise': [exerciseId: string, data: Record<string, unknown>]
  'next-exercise': []
  'prev-exercise': []
  'complete': []
  'abandon': []
  'show-history': [exerciseId: string]
  'set-completed-event': [{ setRestSec: number | null; exerciseRestSec: number | null }]
}>()

const { formatEnum } = useFormatEnum()

// Notes
const showNotes = ref(!!props.currentExercise?.notes)
const notesText = ref(props.currentExercise?.notes ?? '')

watch(
  () => props.currentExercise,
  (ex) => {
    showNotes.value = !!ex?.notes
    notesText.value = ex?.notes ?? ''
  },
)

const { schedule: scheduleNoteSave } = useAutoSave(
  async () => {
    if (props.currentExercise) {
      emit('update-exercise', props.currentExercise.id, {
        notes: notesText.value.trim() || undefined,
      })
    }
  },
  { debounceMs: 600 },
)

const dropdownItems = computed(() => [
  [
    {
      label: 'Add Exercise',
      icon: 'i-lucide-plus',
      onSelect: () => emit('add-exercise'),
    },
    ...(props.currentExercise
      ? [
          {
            label: 'Remove Exercise',
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            onSelect: () => emit('remove-exercise', props.currentExercise!.id),
          },
        ]
      : []),
  ],
  [
    {
      label: 'Complete Workout',
      icon: 'i-lucide-check-circle',
      onSelect: () => emit('complete'),
    },
    {
      label: 'Abandon Workout',
      icon: 'i-lucide-x-circle',
      color: 'error' as const,
      onSelect: () => emit('abandon'),
    },
  ],
])

function onSetUpdate(exerciseId: string, setId: string, data: Record<string, unknown>) {
  emit('update-set', exerciseId, setId, data)
}

function onToggleCompleted(exerciseId: string, setId: string, setRestSec: number | null, exerciseRestSec: number | null) {
  emit('toggle-set-completed', exerciseId, setId)
  // Emit set-completed-event for rest timer
  emit('set-completed-event', { setRestSec, exerciseRestSec })
}

// Rest timer display
const restTimer = computed(() => props.slot.restTimer)
const isTimerActive = computed(
  () => restTimer.value.isRunning.value || restTimer.value.isCompleted.value,
)
const isReady = computed(() => restTimer.value.isCompleted.value)
</script>

<template>
  <UCard
    class="transition-all duration-300"
    :class="{ 'card-ready': isReady }"
  >
    <!-- Card Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <div class="min-w-0">
          <p class="font-semibold text-sm truncate">{{ slot.athleteName }}</p>
          <p v-if="slot.session" class="text-xs text-muted">
            <SessionsSessionTimer :started-at="slot.session.startedAt" />
          </p>
        </div>
      </div>

      <UDropdownMenu :items="dropdownItems">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          size="xs"
          color="neutral"
          variant="ghost"
        />
      </UDropdownMenu>
    </div>

    <!-- Loading -->
    <div v-if="slot.loading" class="flex justify-center py-6">
      <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
    </div>

    <!-- Error -->
    <div v-else-if="slot.error" class="text-center py-4">
      <p class="text-sm text-error">{{ slot.error }}</p>
    </div>

    <!-- No session -->
    <div v-else-if="!slot.session" class="text-center py-4">
      <p class="text-sm text-muted">No active session</p>
    </div>

    <!-- No exercises -->
    <div v-else-if="exerciseCount === 0" class="text-center py-4">
      <p class="text-sm text-muted mb-2">No exercises yet</p>
      <UButton
        label="Add Exercise"
        icon="i-lucide-plus"
        size="xs"
        variant="outline"
        @click="emit('add-exercise')"
      />
    </div>

    <!-- Current exercise view -->
    <template v-else-if="currentExercise">
      <!-- Exercise navigator -->
      <div class="flex items-center gap-1 mb-3">
        <UButton
          icon="i-lucide-chevron-left"
          size="xs"
          variant="ghost"
          color="neutral"
          :disabled="exerciseIndex <= 0"
          @click="emit('prev-exercise')"
        />

        <div class="flex-1 text-center min-w-0">
          <p class="text-sm font-medium truncate">
            {{ currentExercise.exercise.name }}
          </p>
          <p class="text-xs text-muted">
            {{ exerciseIndex + 1 }}/{{ exerciseCount }}
            <span v-if="currentExercise.exercise.equipment" class="ml-1">
              · {{ formatEnum(currentExercise.exercise.equipment) }}
            </span>
          </p>
        </div>

        <UButton
          icon="i-lucide-message-square"
          size="xs"
          :variant="showNotes ? 'soft' : 'ghost'"
          color="neutral"
          aria-label="Toggle notes"
          @click="showNotes = !showNotes"
        />

        <UButton
          icon="i-lucide-clock-3"
          size="xs"
          variant="ghost"
          color="neutral"
          aria-label="View history"
          @click="emit('show-history', currentExercise.exerciseId)"
        />

        <UButton
          icon="i-lucide-chevron-right"
          size="xs"
          variant="ghost"
          color="neutral"
          :disabled="exerciseIndex >= exerciseCount - 1"
          @click="emit('next-exercise')"
        />
      </div>

      <!-- Notes -->
      <div v-if="showNotes" class="mb-3">
        <UTextarea
          v-model="notesText"
          placeholder="Exercise notes..."
          :rows="2"
          size="sm"
          @blur="scheduleNoteSave()"
        />
      </div>

      <!-- Sets -->
      <div class="space-y-0.5 mb-2">
        <!-- Column header -->
        <div class="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-muted">
          <span class="w-5 text-center shrink-0">#</span>
          <span
            v-if="['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(currentExercise.exercise.trackingType)"
            class="flex-1"
          >
            kg
          </span>
          <span
            v-if="['WEIGHT_REPS', 'REPS_ONLY'].includes(currentExercise.exercise.trackingType)"
            class="flex-1"
          >
            Reps
          </span>
          <span
            v-if="['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(currentExercise.exercise.trackingType)"
            class="flex-1"
          >
            Sec
          </span>
          <span
            v-if="currentExercise.exercise.trackingType === 'DISTANCE_DURATION'"
            class="flex-1"
          >
            km
          </span>
          <span class="w-7 shrink-0" />
          <span class="w-6 shrink-0" />
        </div>

        <TrainerGroupSessionCompactSetInput
          v-for="(set, idx) in currentExercise.sets"
          :key="set.id"
          :set="set"
          :set-index="idx"
          :tracking-type="currentExercise.exercise.trackingType"
          @update="onSetUpdate(currentExercise.id, set.id, $event)"
          @toggle-completed="onToggleCompleted(
            currentExercise.id,
            set.id,
            set.restSec,
            currentExercise.prescribedExercise?.restSec ?? null
          )"
          @delete="emit('delete-set', currentExercise.id, set.id)"
        />
      </div>

      <!-- Add set button -->
      <UButton
        label="Add Set"
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        color="neutral"
        block
        @click="emit('add-set', currentExercise.id)"
      />

      <!-- Inline rest timer -->
      <div
        v-if="isTimerActive"
        class="mt-3 px-2 py-1.5 rounded-md text-center text-sm"
        :class="isReady ? 'bg-success/10 text-success' : 'bg-elevated'"
      >
        <span v-if="isReady" class="font-medium">Ready!</span>
        <template v-else>
          <UIcon name="i-lucide-timer" class="size-3.5 inline mr-1" />
          <span class="font-mono">{{ restTimer.formattedTime.value }}</span>
        </template>
        <button
          class="ml-2 text-xs underline opacity-70 hover:opacity-100"
          @click="restTimer.skip()"
        >
          {{ isReady ? 'Dismiss' : 'Skip' }}
        </button>
      </div>
    </template>
  </UCard>
</template>

<style scoped>
@keyframes card-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(34, 197, 94, 0.35);
  }
}

.card-ready {
  animation: card-glow 1.5s ease-in-out infinite;
  border-color: rgb(34, 197, 94);
}
</style>
