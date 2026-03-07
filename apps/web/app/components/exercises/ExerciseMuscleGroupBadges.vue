<script setup lang="ts">
interface MuscleGroupEntry {
  id: string
  role: 'PRIMARY' | 'SECONDARY'
  muscleGroup: {
    id: string
    name: string
    bodyRegion: string
  }
}

const props = defineProps<{
  muscleGroups: MuscleGroupEntry[]
  max?: number
}>()

const maxDisplay = computed(() => props.max ?? 3)
const displayed = computed(() => props.muscleGroups.slice(0, maxDisplay.value))
const overflowCount = computed(() => Math.max(0, props.muscleGroups.length - maxDisplay.value))
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <UBadge
      v-for="mg in displayed"
      :key="mg.id"
      :color="mg.role === 'PRIMARY' ? 'primary' : 'neutral'"
      :variant="mg.role === 'PRIMARY' ? 'solid' : 'subtle'"
      size="xs"
    >
      {{ mg.muscleGroup.name }}
    </UBadge>
    <UBadge
      v-if="overflowCount > 0"
      color="neutral"
      variant="outline"
      size="xs"
    >
      +{{ overflowCount }}
    </UBadge>
  </div>
</template>
