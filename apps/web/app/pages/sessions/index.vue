<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const sessionStore = useSessionStore()
const router = useRouter()

const showStartModal = ref(false)

onMounted(async () => {
  await Promise.all([
    sessionStore.fetchActive(),
    sessionStore.fetchSessions(),
  ])
})

function onSessionStarted() {
  router.push('/sessions/active')
}

function startWorkout() {
  if (sessionStore.hasActiveSession) {
    router.push('/sessions/active')
  } else {
    showStartModal.value = true
  }
}
</script>

<template>
  <UContainer>
    <UPageHeader
      title="Sessions"
      description="Your workout history"
    >
      <template #links>
        <UButton
          :label="sessionStore.hasActiveSession ? 'Resume Workout' : 'Start Workout'"
          :icon="sessionStore.hasActiveSession ? 'i-lucide-play' : 'i-lucide-plus'"
          @click="startWorkout"
        />
      </template>
    </UPageHeader>

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

    <!-- Loading -->
    <div v-if="sessionStore.loading" class="space-y-3">
      <USkeleton class="h-24 w-full rounded-lg" />
      <USkeleton class="h-24 w-full rounded-lg" />
      <USkeleton class="h-24 w-full rounded-lg" />
    </div>

    <!-- Session list -->
    <div v-else-if="sessionStore.sessions.length > 0" class="space-y-3">
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
    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <UIcon name="i-lucide-dumbbell" class="size-12 text-muted mb-4" />
      <h3 class="text-lg font-medium mb-2">No workouts yet</h3>
      <p class="text-sm text-muted mb-6">
        Start your first workout to begin tracking your progress.
      </p>
      <UButton
        label="Start Workout"
        icon="i-lucide-play"
        size="lg"
        @click="showStartModal = true"
      />
    </div>

    <SessionsSessionStartModal
      v-model="showStartModal"
      @started="onSessionStarted"
    />
  </UContainer>
</template>
