<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const profileStore = useProfileStore()

const editOpen = ref(false)

// Fetch all data on mount
onMounted(() => {
  const now = new Date()
  Promise.all([
    profileStore.fetchStats(),
    profileStore.fetchWeeklyStats('12w', 'duration'),
    profileStore.fetchCalendarStats(now.getMonth() + 1, now.getFullYear()),
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
  profileStore.fetchCalendarStats(month, year)
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6">
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
        :data="profileStore.calendarData"
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
  </div>
</template>
