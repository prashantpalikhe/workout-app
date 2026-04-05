<script setup lang="ts">
import {
  EXERCISE_EQUIPMENT,
  EXERCISE_MOVEMENT_PATTERNS
} from '@workout/shared'

const exerciseStore = useExerciseStore()
const { formatEnum } = useFormatEnum()

const searchQuery = ref(exerciseStore.filters.search)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    exerciseStore.filters.search = val
    exerciseStore.filters.page = 1
    exerciseStore.fetchExercises()
  }, 300)
})

const equipmentItems = EXERCISE_EQUIPMENT.map(e => ({
  label: formatEnum(e),
  value: e
}))

const movementItems = EXERCISE_MOVEMENT_PATTERNS.map(m => ({
  label: formatEnum(m),
  value: m
}))

const muscleGroupItems = computed(() =>
  exerciseStore.muscleGroups.map(mg => ({
    label: mg.name,
    value: mg.id
  }))
)

// Local refs that sync with store (USelect needs a defined value, not undefined)
const selectedEquipment = ref(exerciseStore.filters.equipment || '')
const selectedMovement = ref(exerciseStore.filters.movementPattern || '')
const selectedMuscleGroup = ref(exerciseStore.filters.muscleGroupId || '')

function onEquipmentChange(val: string) {
  selectedEquipment.value = val
  exerciseStore.filters.equipment = val || undefined
  exerciseStore.filters.page = 1
  exerciseStore.fetchExercises()
}

function onMovementChange(val: string) {
  selectedMovement.value = val
  exerciseStore.filters.movementPattern = val || undefined
  exerciseStore.filters.page = 1
  exerciseStore.fetchExercises()
}

function onMuscleGroupChange(val: string) {
  selectedMuscleGroup.value = val
  exerciseStore.filters.muscleGroupId = val || undefined
  exerciseStore.filters.page = 1
  exerciseStore.fetchExercises()
}

function clearFilters() {
  searchQuery.value = ''
  selectedEquipment.value = ''
  selectedMovement.value = ''
  selectedMuscleGroup.value = ''
  exerciseStore.resetFilters()
}
</script>

<template>
  <div class="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
    <UInput
      v-model="searchQuery"
      placeholder="Search exercises..."
      icon="i-lucide-search"
      class="flex-1 min-w-48"
    />

    <USelect
      :model-value="selectedEquipment"
      :items="equipmentItems"
      placeholder="All Equipment"
      class="w-full sm:w-48"
      @update:model-value="onEquipmentChange"
    />

    <USelect
      :model-value="selectedMovement"
      :items="movementItems"
      placeholder="All Movements"
      class="w-full sm:w-48"
      @update:model-value="onMovementChange"
    />

    <USelect
      :model-value="selectedMuscleGroup"
      :items="muscleGroupItems"
      placeholder="All Muscle Groups"
      class="w-full sm:w-48"
      @update:model-value="onMuscleGroupChange"
    />

    <UButton
      v-if="exerciseStore.hasActiveFilters"
      label="Clear"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      @click="clearFilters"
    />
  </div>
</template>
