<script setup lang="ts">
import { SESSION_SET_TYPES } from '@workout/shared'
import type { SessionExercise } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exercise: SessionExercise
}>()

const emit = defineEmits<{
  substitute: []
  remove: []
}>()

const sessionStore = useSessionStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()

const addingSet = ref(false)

const trackingType = computed(() => props.exercise.exercise.trackingType)

// Column labels based on tracking type
const columnLabels = computed(() => {
  const base = ['Set', 'Type']
  switch (trackingType.value) {
    case 'WEIGHT_REPS': return [...base, 'Weight (kg)', 'Reps', 'RPE', '', '']
    case 'REPS_ONLY': return [...base, 'Reps', 'RPE', '', '']
    case 'DURATION': return [...base, 'Duration (s)', 'RPE', '', '']
    case 'WEIGHT_DURATION': return [...base, 'Weight (kg)', 'Duration (s)', 'RPE', '', '']
    case 'DISTANCE_DURATION': return [...base, 'Distance (km)', 'Duration (s)', 'RPE', '', '']
    default: return [...base, 'Weight (kg)', 'Reps', 'RPE', '', '']
  }
})

async function addSet() {
  addingSet.value = true
  try {
    await sessionStore.addSet(props.sessionId, props.exercise.id, {
      setNumber: props.exercise.sets.length + 1,
      setType: 'WORKING',
      completed: false,
    })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to add set', color: 'error' })
  } finally {
    addingSet.value = false
  }
}

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
  <UCard>
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-medium truncate">{{ exercise.exercise.name }}</span>
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
      <UDropdownMenu :items="dropdownItems">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          size="xs"
        />
      </UDropdownMenu>
    </div>

    <!-- Column headers -->
    <div
      v-if="exercise.sets.length > 0"
      class="grid gap-2 mb-1 px-1"
      :class="trackingType === 'REPS_ONLY' || trackingType === 'DURATION'
        ? 'grid-cols-[2.5rem_5rem_1fr_3rem_2rem_2rem]'
        : 'grid-cols-[2.5rem_5rem_1fr_1fr_3rem_2rem_2rem]'"
    >
      <span
        v-for="(label, i) in columnLabels"
        :key="i"
        class="text-xs text-muted font-medium"
      >
        {{ label }}
      </span>
    </div>

    <!-- Set rows -->
    <div class="space-y-1">
      <SessionsSessionSetRow
        v-for="(set, index) in exercise.sets"
        :key="set.id"
        :session-id="sessionId"
        :exercise-id="exercise.id"
        :set="set"
        :set-index="index"
        :tracking-type="trackingType"
      />
    </div>

    <!-- Add set button -->
    <UButton
      label="Add Set"
      icon="i-lucide-plus"
      variant="ghost"
      size="sm"
      class="mt-2 w-full"
      :loading="addingSet"
      @click="addSet"
    />
  </UCard>
</template>
