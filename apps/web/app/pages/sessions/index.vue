<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const sessionStore = useSessionStore()

onMounted(async () => {
  await Promise.all([
    sessionStore.fetchActive(),
    sessionStore.fetchSessions()
  ])
})
</script>

<template>
  <UContainer>
    <AppPageHeader
      title="Sessions"
      description="Your workout history"
    >
      <template #links>
        <UButton
          v-if="sessionStore.hasActiveSession"
          label="Resume Workout"
          icon="i-lucide-play"
          to="/sessions/active"
        />
        <AppStartWorkoutButton v-else label="Start Workout" />
      </template>
    </AppPageHeader>

    <!-- Active session banner -->
    <NuxtLink
      v-if="sessionStore.hasActiveSession"
      to="/sessions/active"
      class="block mb-6"
    >
      <UAlert
        title="You have an active workout"
        :description="sessionStore.activeSession!.name"
        icon="i-lucide-timer"
        color="info"
        class="cursor-pointer hover:opacity-90 transition-opacity"
      />
    </NuxtLink>

    <SessionsSessionFilters />

    <!-- Session list -->
    <div v-if="sessionStore.sessions.length > 0" class="space-y-3">
      <SessionsSessionHistoryCard
        v-for="session in sessionStore.sessions"
        :key="session.id"
        :session="session"
      />

      <!-- Pagination -->
      <div
        v-if="sessionStore.meta.totalPages > 1"
        class="flex justify-center pt-4"
      >
        <UPagination
          :model-value="sessionStore.meta.page"
          :total="sessionStore.meta.total"
          :items-per-page="sessionStore.meta.limit"
          @update:model-value="(page: number) => { sessionStore.filters.page = page; sessionStore.fetchSessions() }"
        />
      </div>
    </div>

    <!-- Empty state -->
    <AppEmptyState
      v-else
      icon="i-lucide-dumbbell"
      title="No workouts yet"
      description="Start your first workout to begin tracking your progress."
    >
      <AppStartWorkoutButton label="Start Workout" />
    </AppEmptyState>
  </UContainer>
</template>
