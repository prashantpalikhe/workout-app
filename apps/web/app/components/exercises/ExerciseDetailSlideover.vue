<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

defineProps<{
  exercise: Exercise | null
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [exercise: Exercise]
  delete: [exercise: Exercise]
}>()

const open = defineModel<boolean>({ default: false })

const { formatEnum } = useFormatEnum()
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="exercise?.name || 'Exercise Detail'"
    side="right"
  >
    <template #body>
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else-if="exercise" class="space-y-6">
        <!-- Badge -->
        <div>
          <UBadge
            :color="exercise.isGlobal ? 'neutral' : 'primary'"
            :variant="exercise.isGlobal ? 'subtle' : 'solid'"
            size="sm"
          >
            {{ exercise.isGlobal ? 'Global' : 'Custom' }}
          </UBadge>
        </div>

        <!-- Details -->
        <dl class="space-y-3">
          <div>
            <dt class="text-sm font-medium text-muted">
              Tracking Type
            </dt>
            <dd>{{ formatEnum(exercise.trackingType) }}</dd>
          </div>

          <div v-if="exercise.equipment">
            <dt class="text-sm font-medium text-muted">
              Equipment
            </dt>
            <dd>{{ formatEnum(exercise.equipment) }}</dd>
          </div>

          <div v-if="exercise.movementPattern">
            <dt class="text-sm font-medium text-muted">
              Movement Pattern
            </dt>
            <dd>{{ formatEnum(exercise.movementPattern) }}</dd>
          </div>
        </dl>

        <!-- Muscle Groups -->
        <div v-if="exercise.muscleGroups.length > 0">
          <h3 class="text-sm font-medium text-muted mb-2">
            Muscle Groups
          </h3>
          <ExercisesExerciseMuscleGroupBadges
            :muscle-groups="exercise.muscleGroups"
            :max="20"
          />
        </div>

        <!-- Instructions -->
        <div>
          <h3 class="text-sm font-medium text-muted mb-2">
            Instructions
          </h3>
          <p
            v-if="exercise.instructions"
            class="text-sm whitespace-pre-wrap"
          >
            {{ exercise.instructions }}
          </p>
          <p
            v-else
            class="text-sm text-muted italic"
          >
            No instructions provided.
          </p>
        </div>
      </div>
    </template>

    <template v-if="exercise && !exercise.isGlobal" #footer>
      <div class="flex gap-3">
        <UButton
          label="Edit"
          icon="i-lucide-pencil"
          variant="outline"
          @click="emit('edit', exercise)"
        />
        <UButton
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          variant="outline"
          @click="emit('delete', exercise)"
        />
      </div>
    </template>
  </USlideover>
</template>
