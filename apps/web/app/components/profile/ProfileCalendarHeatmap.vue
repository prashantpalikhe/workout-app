<script setup lang="ts">
import type { CalendarStatsResponse, CalendarWorkoutDay } from '@workout/shared'
import type { WorkoutSession } from '~/stores/sessions'

const props = defineProps<{
  data: CalendarStatsResponse | null
  loading: boolean
}>()

const emit = defineEmits<{
  'update:month': [month: number, year: number]
}>()

const { api } = useApiClient()

const now = new Date()
const currentMonth = ref(now.getMonth() + 1)
const currentYear = ref(now.getFullYear())

// ── Popover state ──
const openDay = ref<number | null>(null)
const daySessions = ref<Record<string, WorkoutSession[]>>({})
const dayLoading = ref<Record<string, boolean>>({})

function onPopoverToggle(day: number, open: boolean) {
  if (open) {
    openDay.value = day
    fetchDaySessions(day)
  } else if (openDay.value === day) {
    openDay.value = null
  }
}

async function fetchDaySessions(day: number) {
  const dateStr = getDateStr(day)
  if (daySessions.value[dateStr]) return // already cached

  dayLoading.value[dateStr] = true
  try {
    const result = await api<{ data: WorkoutSession[] }>('/sessions', {
      query: { fromDate: dateStr, toDate: dateStr, status: 'COMPLETED', limit: 10 },
    })
    daySessions.value[dateStr] = result.data
  } finally {
    dayLoading.value[dateStr] = false
  }
}

function getDateStr(day: number): string {
  return `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDuration(session: WorkoutSession): string {
  if (!session.completedAt) return ''
  const mins = Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Clear cache when month changes
watch([currentMonth, currentYear], () => {
  openDay.value = null
  daySessions.value = {}
  dayLoading.value = {}
})

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
        <template v-for="(cell, i) in calendarCells" :key="i">
          <!-- Workout day: clickable with popover -->
          <UPopover
            v-if="cell.day && cell.workout"
            :open="openDay === cell.day"
            @update:open="(open: boolean) => onPopoverToggle(cell.day!, open)"
          >
            <template #default>
              <div
                class="aspect-square flex items-center justify-center text-xs rounded-md transition-colors cursor-pointer hover:ring-1 hover:ring-primary/50"
                :class="[
                  cell.isToday ? 'ring-1 ring-primary' : '',
                  intensityClass(cell.workout),
                ]"
              >
                {{ cell.day }}
              </div>
            </template>
            <template #content>
              <div class="p-3 max-w-64">
                <p class="text-xs text-muted mb-2">{{ formatDateLabel(getDateStr(cell.day)) }}</p>

                <!-- Loading -->
                <div v-if="dayLoading[getDateStr(cell.day)]" class="space-y-2">
                  <USkeleton class="h-4 w-full" />
                  <USkeleton class="h-4 w-3/4" />
                </div>

                <!-- Sessions list -->
                <div v-else-if="daySessions[getDateStr(cell.day)]?.length" class="space-y-2">
                  <div
                    v-for="session in daySessions[getDateStr(cell.day)]"
                    :key="session.id"
                    class="space-y-1"
                  >
                    <p class="text-sm font-medium">{{ session.name }}</p>
                    <div class="flex items-center gap-2 text-xs text-muted">
                      <span v-if="formatDuration(session)">{{ formatDuration(session) }}</span>
                      <span>{{ session.sessionExercises.length }} exercise{{ session.sessionExercises.length !== 1 ? 's' : '' }}</span>
                    </div>
                    <NuxtLink
                      :to="`/sessions/${session.id}`"
                      class="text-xs text-primary hover:underline"
                    >
                      See Workout
                    </NuxtLink>
                  </div>
                </div>

                <!-- Fallback -->
                <p v-else class="text-xs text-muted">
                  {{ cell.workout.sessionCount }} workout{{ cell.workout.sessionCount !== 1 ? 's' : '' }}
                </p>
              </div>
            </template>
          </UPopover>

          <!-- Non-workout day or empty cell -->
          <div
            v-else
            class="aspect-square flex items-center justify-center text-xs rounded-md transition-colors"
            :class="[
              cell.isToday ? 'ring-1 ring-primary' : '',
              cell.day ? 'bg-elevated/30' : '',
            ]"
          >
            {{ cell.day ?? '' }}
          </div>
        </template>
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
