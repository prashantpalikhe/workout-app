<script setup lang="ts">
import type { ProgramExercise } from '~/stores/programs'

defineProps<{
  exercise: ProgramExercise
  isFirst: boolean
  isLast: boolean
}>()

defineEmits<{
  edit: []
  remove: []
  moveUp: []
  moveDown: []
}>()

const { formatEnum } = useFormatEnum()
</script>

<template>
  <div class="border border-default rounded-lg p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <!-- Exercise name + equipment -->
        <div class="flex items-center gap-2 mb-1">
          <span class="font-medium">{{ exercise.exercise.name }}</span>
          <UBadge
            v-if="exercise.exercise.equipment"
            variant="subtle"
            size="xs"
          >
            {{ formatEnum(exercise.exercise.equipment) }}
          </UBadge>
        </div>

        <!-- Target details -->
        <div class="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted">
          <span v-if="exercise.targetSets">{{ exercise.targetSets }} sets</span>
          <span v-if="exercise.targetSets && exercise.targetReps">&middot;</span>
          <span v-if="exercise.targetReps">{{ exercise.targetReps }} reps</span>
          <span v-if="(exercise.targetSets || exercise.targetReps) && exercise.targetRpe">&middot;</span>
          <span v-if="exercise.targetRpe">RPE {{ exercise.targetRpe }}</span>
          <span v-if="(exercise.targetSets || exercise.targetReps || exercise.targetRpe) && exercise.targetTempo">&middot;</span>
          <span v-if="exercise.targetTempo">Tempo {{ exercise.targetTempo }}</span>
          <span v-if="(exercise.targetSets || exercise.targetReps || exercise.targetRpe || exercise.targetTempo) && exercise.restSec">&middot;</span>
          <span v-if="exercise.restSec">Rest {{ exercise.restSec }}s</span>
        </div>

        <!-- Notes -->
        <p
          v-if="exercise.notes"
          class="text-xs text-muted mt-1 italic"
        >
          {{ exercise.notes }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 shrink-0">
        <UButton
          icon="i-lucide-chevron-up"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Move up"
          :disabled="isFirst"
          @click="$emit('moveUp')"
        />
        <UButton
          icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Move down"
          :disabled="isLast"
          @click="$emit('moveDown')"
        />
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Edit exercise"
          @click="$emit('edit')"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          aria-label="Remove exercise"
          @click="$emit('remove')"
        />
      </div>
    </div>
  </div>
</template>
