<script setup lang="ts">
import type { CalendarStatsResponse, CalendarWorkoutDay } from '@workout/shared'
import type { WorkoutSession } from '~/stores/sessions'

const props = defineProps<{
  monthsData: Record<string, CalendarStatsResponse>
  loading: boolean
}>()

const emit = defineEmits<{
  'update:month': [month: number, year: number]
}>()

const { api } = useApiClient()

const now = new Date()
const currentMonth = ref(now.getMonth() + 1)
const currentYear = ref(now.getFullYear())

// ── Popover state (keyed by dateStr so it's unambiguous across months) ──
const openDateStr = ref<string | null>(null)
const daySessions = ref<Record<string, WorkoutSession[]>>({})
const dayLoading = ref<Record<string, boolean>>({})

function onPopoverToggle(dateStr: string, open: boolean) {
  if (open) {
    openDateStr.value = dateStr
    fetchDaySessions(dateStr)
  } else if (openDateStr.value === dateStr) {
    openDateStr.value = null
  }
}

async function fetchDaySessions(dateStr: string) {
  if (daySessions.value[dateStr]) return // already cached

  dayLoading.value[dateStr] = true
  try {
    const result = await api<{ data: WorkoutSession[] }>('/sessions', {
      query: { fromDate: dateStr, toDate: dateStr, status: 'COMPLETED', limit: 10 }
    })
    daySessions.value[dateStr] = result.data
  } finally {
    dayLoading.value[dateStr] = false
  }
}

function getDateStr(month: number, year: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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

// Clear popover state when the visible range changes
watch([currentMonth, currentYear], () => {
  openDateStr.value = null
})

function prevOf(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}

function calendarKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

// Two visible months: previous (left) and current (right)
const visibleMonths = computed(() => {
  const prev = prevOf(currentMonth.value, currentYear.value)
  return [
    { month: prev.month, year: prev.year, responsive: 'hidden xl:block' },
    { month: currentMonth.value, year: currentYear.value, responsive: '' }
  ]
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
  const isCurrentMonth
    = currentMonth.value === now.getMonth() + 1
      && currentYear.value === now.getFullYear()
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
    currentMonth.value === now.getMonth() + 1
    && currentYear.value === now.getFullYear()
  )
})

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Build calendar grid cells for a given month
function getCalendarCells(month: number, year: number) {
  const data = props.monthsData[calendarKey(month, year)]
  const workoutMap = new Map<number, CalendarWorkoutDay>()
  if (data?.workoutDays) {
    for (const day of data.workoutDays) {
      const d = new Date(day.date)
      workoutMap.set(d.getDate(), day)
    }
  }

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()

  // Mon=0 … Sun=6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: Array<{ day: number | null, workout: CalendarWorkoutDay | null, isToday: boolean }> = []

  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, workout: null, isToday: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday
      = d === now.getDate()
        && month === now.getMonth() + 1
        && year === now.getFullYear()
    cells.push({
      day: d,
      workout: workoutMap.get(d) ?? null,
      isToday
    })
  }

  return cells
}

function intensityClass(workout: CalendarWorkoutDay | null): string {
  if (!workout) return ''
  if (workout.sessionCount >= 3) return 'bg-primary/80 text-white'
  if (workout.sessionCount === 2) return 'bg-primary/50 text-white'
  return 'bg-primary/25'
}
</script>

<template>
  <UCard>
    <!-- Nav + range label -->
    <div class="flex items-center justify-between mb-4 max-w-md mx-auto xl:max-w-none">
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        size="xs"
        @click="prevMonth"
      />
      <span class="text-sm font-medium">
        <span class="hidden xl:inline">
          {{ monthLabel(visibleMonths[0]!.month, visibleMonths[0]!.year) }}
          <span class="text-muted mx-1">–</span>
        </span>
        {{ monthLabel(visibleMonths[1]!.month, visibleMonths[1]!.year) }}
      </span>
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        size="xs"
        :disabled="isNextDisabled"
        @click="nextMonth"
      />
    </div>

    <template v-if="loading && !Object.keys(monthsData).length">
      <div class="h-48 flex items-center justify-center">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>
    </template>
    <template v-else>
      <div class="grid xl:grid-cols-2 gap-6 max-w-md mx-auto xl:max-w-2xl">
        <div
          v-for="m in visibleMonths"
          :key="`${m.year}-${m.month}`"
          :class="m.responsive"
        >
          <!-- Month label (only visible on xl) -->
          <div class="hidden xl:block text-center text-xs font-medium text-muted mb-2">
            {{ monthLabel(m.month, m.year) }}
          </div>

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
            <template v-for="(cell, i) in getCalendarCells(m.month, m.year)" :key="i">
              <!-- Workout day: clickable with popover -->
              <UPopover
                v-if="cell.day && cell.workout"
                :open="openDateStr === getDateStr(m.month, m.year, cell.day)"
                @update:open="(open: boolean) => onPopoverToggle(getDateStr(m.month, m.year, cell.day!), open)"
              >
                <template #default>
                  <div
                    class="aspect-square flex items-center justify-center text-xs rounded-md transition-colors cursor-pointer hover:ring-1 hover:ring-primary/50"
                    :class="[
                      cell.isToday ? 'ring-1 ring-primary' : '',
                      intensityClass(cell.workout)
                    ]"
                  >
                    {{ cell.day }}
                  </div>
                </template>
                <template #content>
                  <div class="p-3 max-w-64">
                    <p class="text-xs text-muted mb-2">
                      {{ formatDateLabel(getDateStr(m.month, m.year, cell.day)) }}
                    </p>

                    <!-- Loading -->
                    <div v-if="dayLoading[getDateStr(m.month, m.year, cell.day)]" class="flex justify-center py-4">
                      <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-muted" />
                    </div>

                    <!-- Sessions list -->
                    <div v-else-if="daySessions[getDateStr(m.month, m.year, cell.day)]?.length" class="space-y-2">
                      <div
                        v-for="session in daySessions[getDateStr(m.month, m.year, cell.day)]"
                        :key="session.id"
                        class="space-y-1"
                      >
                        <p class="text-sm font-medium">
                          {{ session.name }}
                        </p>
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
                  cell.day ? 'bg-elevated/30' : ''
                ]"
              >
                {{ cell.day ?? '' }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted max-w-md mx-auto xl:max-w-2xl">
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
