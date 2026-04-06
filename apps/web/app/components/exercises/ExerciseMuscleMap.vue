<script setup lang="ts">
interface MuscleHighlight {
  muscleGroup: { name: string }
  role: 'PRIMARY' | 'SECONDARY'
}

const props = withDefaults(defineProps<{
  highlightedMuscles?: MuscleHighlight[]
}>(), {
  highlightedMuscles: () => []
})

const primaryMuscleGroups = computed(() =>
  props.highlightedMuscles
    .filter(m => m.role === 'PRIMARY')
    .map(m => m.muscleGroup.name)
)

const secondaryMuscleGroups = computed(() =>
  props.highlightedMuscles
    .filter(m => m.role === 'SECONDARY')
    .map(m => m.muscleGroup.name)
)
</script>

<template>
  <HumanMuscleAnatomy
    :selected-primary-muscle-groups="primaryMuscleGroups"
    :selected-secondary-muscle-groups="secondaryMuscleGroups"
    default-muscle-color="var(--ui-border-accented)"
    background-color="var(--ui-bg-muted)"
    primary-highlight-color="var(--ui-primary)"
    secondary-highlight-color="var(--ui-primary)"
    :primary-opacity="0.75"
    :secondary-opacity="0.35"
  />
</template>
