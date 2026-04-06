<script setup lang="ts">
import { EXERCISE_EQUIPMENT, EXERCISE_MOVEMENT_PATTERNS } from '@workout/shared'

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

const activeFilterCount = computed(() => {
  let n = 0
  if (selectedEquipment.value) n++
  if (selectedMovement.value) n++
  if (selectedMuscleGroup.value) n++
  return n
})

const filtersExpanded = ref(false)
</script>

<template>
  <div class="mb-6">
    <!-- Search row -->
    <div class="flex items-center gap-2">
      <UInput
        v-model="searchQuery"
        placeholder="Search exercises..."
        icon="i-lucide-search"
        class="flex-1 bg-black"
      >
        <template v-if="searchQuery" #trailing>
          <UIcon
            name="i-lucide-x"
            class="size-4 cursor-pointer text-muted hover:text-default"
            @click="searchQuery = ''"
          />
        </template>
      </UInput>
      <!-- Filter toggle button -->
      <UButton
        :icon="
          filtersExpanded
            ? 'i-lucide-chevron-up'
            : 'i-lucide-sliders-horizontal'
        "
        color="neutral"
        variant="outline"
        :aria-label="filtersExpanded ? 'Hide filters' : 'Show filters'"
        @click="filtersExpanded = !filtersExpanded"
      >
        <span
          v-if="activeFilterCount && !filtersExpanded"
          class="ml-1 inline-flex items-center justify-center size-5 rounded-full bg-primary text-inverted text-xs font-medium"
        >
          {{ activeFilterCount }}
        </span>
      </UButton>
    </div>

    <!-- Filters: collapsible on all sizes -->
    <div
      v-if="filtersExpanded"
      class="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-3"
    >
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

      <div
        v-if="exerciseStore.hasActiveFilters"
        class="flex justify-end sm:block"
      >
        <UButton
          label="Clear"
          icon="i-lucide-x"
          color="neutral"
          variant="subtle"
          @click="clearFilters"
        />
      </div>
    </div>
  </div>
</template>
