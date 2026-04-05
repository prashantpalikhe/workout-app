<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const profileStore = useProfileStore()

const editOpen = ref(false)

function prevOf(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}

// Fetch all data on mount
onMounted(() => {
  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()
  const prev = prevOf(curMonth, curYear)
  Promise.all([
    profileStore.fetchStats(),
    profileStore.fetchWeeklyStats('12w', 'duration'),
    profileStore.fetchCalendarStats(curMonth, curYear),
    profileStore.fetchCalendarStats(prev.month, prev.year),
    profileStore.fetchProfile(),
    profileStore.fetchRecentSessions()
  ])
})

function onMetricChange(metric: string) {
  const range = profileStore.weeklyData?.range ?? '12w'
  profileStore.fetchWeeklyStats(range, metric)
}

function onRangeChange(range: string) {
  const metric = profileStore.weeklyData?.metric ?? 'duration'
  profileStore.fetchWeeklyStats(range, metric)
}

function onCalendarMonthChange(month: number, year: number) {
  const prev = prevOf(month, year)
  profileStore.fetchCalendarStats(month, year)
  profileStore.fetchCalendarStats(prev.month, prev.year)
}
</script>

<template>
  <UContainer>
    <AppPageHeader title="Profile">
      <template #links>
        <UButton
          label="Edit Profile"
          icon="i-lucide-pencil"
          variant="outline"
          @click="editOpen = true"
        />
      </template>
    </AppPageHeader>

    <div class="space-y-6">
      <!-- User Header -->
      <ProfileUserHeader :profile="profileStore.profile" />

      <!-- Stats Bar -->
      <ProfileStatsBar
        :stats="profileStore.stats"
        :loading="profileStore.statsLoading"
      />

      <!-- Weekly Chart -->
      <ProfileWeeklyChart
        :data="profileStore.weeklyData"
        :loading="profileStore.weeklyLoading"
        @update:metric="onMetricChange"
        @update:range="onRangeChange"
      />

      <!-- Calendar Heatmap -->
      <ProfileCalendarHeatmap
        :months-data="profileStore.calendarMonths"
        :loading="profileStore.calendarLoading"
        @update:month="onCalendarMonthChange"
      />

      <!-- Recent Workouts -->
      <ProfileRecentWorkouts
        :sessions="profileStore.recentSessions"
        :loading="false"
      />
    </div>

    <!-- Edit Modal -->
    <ProfileEditModal v-model:open="editOpen" :profile="profileStore.profile" />
  </UContainer>
</template>
