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

const trackingType = computed(() => props.exercise.exercise.trackingType)

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

function onSetCompleted(data: { setId: string, restSec: number | null }) {
  emit('set-completed', {
    setRestSec: data.restSec,
    exerciseRestSec: props.exercise.prescribedExercise?.restSec ?? null
  })
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
        @set-completed="onSetCompleted"
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
