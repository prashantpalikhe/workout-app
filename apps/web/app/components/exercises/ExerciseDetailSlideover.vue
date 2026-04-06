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
        <!-- Images -->
        <UCarousel
          v-if="exercise.imageUrls.length"
          v-slot="{ item }"
          :items="exercise.imageUrls"
          dots
          class="rounded-lg overflow-hidden bg-elevated -mx-4 -mt-2"
        >
          <img :src="item" :alt="exercise.name" class="w-full aspect-[4/3] object-contain">
        </UCarousel>

        <!-- Badge + details -->
        <div class="flex flex-wrap gap-1.5">
          <UBadge
            :color="exercise.isGlobal ? 'neutral' : 'primary'"
            :variant="exercise.isGlobal ? 'subtle' : 'solid'"
            size="sm"
          >
            {{ exercise.isGlobal ? 'Global' : 'Custom' }}
          </UBadge>
          <UBadge variant="subtle" size="sm">
            {{ formatEnum(exercise.trackingType) }}
          </UBadge>
          <UBadge v-if="exercise.equipment" color="neutral" variant="subtle" size="sm">
            {{ formatEnum(exercise.equipment) }}
          </UBadge>
          <UBadge v-if="exercise.movementPattern" color="neutral" variant="subtle" size="sm">
            {{ formatEnum(exercise.movementPattern) }}
          </UBadge>
        </div>

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

        <!-- Instructions (collapsible) -->
        <UAccordion
          v-if="exercise.instructions.length"
          :items="[{ label: `Instructions (${exercise.instructions.length} steps)`, value: 'instructions' }]"
        >
          <template #body>
            <ol class="list-decimal list-inside text-sm space-y-1.5">
              <li v-for="(step, i) in exercise.instructions" :key="i">
                {{ step }}
              </li>
            </ol>
          </template>
        </UAccordion>
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
