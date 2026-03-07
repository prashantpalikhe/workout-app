<script setup lang="ts">
import type { CalendarStatsResponse, CalendarWorkoutDay } from '@workout/shared'

const props = defineProps<{
  data: CalendarStatsResponse | null
  loading: boolean
}>()

const emit = defineEmits<{
  'update:month': [month: number, year: number]
}>()

const now = new Date()
const currentMonth = ref(now.getMonth() + 1)
const currentYear = ref(now.getFullYear())

const monthLabel = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  emit('update:month', currentMonth.value, currentYear.value)
}

function nextMonth() {
  const isCurrentMonth =
    currentMonth.value === now.getMonth() + 1 &&
    currentYear.value === now.getFullYear()
  if (isCurrentMonth) return

  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  emit('update:month', currentMonth.value, currentYear.value)
}

const isNextDisabled = computed(() => {
  return (
    currentMonth.value === now.getMonth() + 1 &&
    currentYear.value === now.getFullYear()
  )
})

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Build workout lookup by day
const workoutMap = computed(() => {
  const map = new Map<number, CalendarWorkoutDay>()
  if (!props.data?.workoutDays) return map
  for (const day of props.data.workoutDays) {
    const d = new Date(day.date)
    map.set(d.getDate(), day)
  }
  return map
})

// Generate calendar grid cells
const calendarCells = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const daysInMonth = lastDay.getDate()

  // Get day of week (0=Sun) → convert to Mon=0
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: Array<{ day: number | null; workout: CalendarWorkoutDay | null; isToday: boolean }> = []

  // Leading empty cells
  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, workout: null, isToday: false })
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === now.getDate() &&
      currentMonth.value === now.getMonth() + 1 &&
      currentYear.value === now.getFullYear()
    cells.push({
      day: d,
      workout: workoutMap.value.get(d) ?? null,
      isToday,
    })
  }

  return cells
})

function intensityClass(workout: CalendarWorkoutDay | null): string {
  if (!workout) return ''
  if (workout.sessionCount >= 3) return 'bg-primary/80 text-white'
  if (workout.sessionCount === 2) return 'bg-primary/50 text-white'
  return 'bg-primary/25'
}
</script>

<template>
  <UCard>
    <!-- Month navigation -->
    <div class="flex items-center justify-between mb-4">
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        size="xs"
        @click="prevMonth"
      />
      <span class="text-sm font-medium">{{ monthLabel }}</span>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        size="xs"
        :disabled="isNextDisabled"
        @click="nextMonth"
      />
    </div>

    <template v-if="loading">
      <USkeleton class="h-48 w-full rounded-lg" />
    </template>
    <template v-else>
      <!-- Day headers -->
      <div class="grid grid-cols-7 gap-1 mb-1">
        <div
          v-for="name in dayNames"
          :key="name"
          class="text-center text-[10px] text-muted font-medium"
        >
          {{ name }}
        </div>
      </div>

      <!-- Calendar grid -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="(cell, i) in calendarCells"
          :key="i"
          class="aspect-square flex items-center justify-center text-xs rounded-md transition-colors"
          :class="[
            cell.day ? 'cursor-default' : '',
            cell.isToday ? 'ring-1 ring-primary' : '',
            cell.workout ? intensityClass(cell.workout) : cell.day ? 'bg-elevated/30' : '',
          ]"
          :title="cell.workout ? `${cell.workout.sessionCount} workout(s)` : ''"
        >
          {{ cell.day ?? '' }}
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted">
        <span>Less</span>
        <div class="size-3 rounded-sm bg-elevated/30" />
        <div class="size-3 rounded-sm bg-primary/25" />
        <div class="size-3 rounded-sm bg-primary/50" />
        <div class="size-3 rounded-sm bg-primary/80" />
        <span>More</span>
      </div>
    </template>
  </UCard>
</template>
