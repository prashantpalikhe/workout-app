<script setup lang="ts">
import type { WorkoutSession } from '~/stores/sessions'

defineProps<{
  sessions: WorkoutSession[]
  loading: boolean
}>()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-semibold">
        Recent Workouts
      </h3>
      <UButton
        label="View All"
        variant="link"
        size="xs"
        to="/sessions"
      />
    </div>

    <AppEmptyState
      v-if="!sessions.length && !loading"
      icon="i-lucide-dumbbell"
      title="No completed workouts yet"
      description="Start a workout to see it here."
    />
    <template v-else>
      <div class="space-y-3">
        <SessionsSessionHistoryCard
          v-for="session in sessions"
          :key="session.id"
          :session="session"
        />
      </div>
    </template>
  </div>
</template>
