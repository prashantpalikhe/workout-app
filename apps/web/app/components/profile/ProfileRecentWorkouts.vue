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

    <template v-if="loading">
      <div class="space-y-3">
        <USkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-lg" />
      </div>
    </template>
    <template v-else-if="!sessions.length">
      <div class="text-center py-8 text-sm text-muted">
        No completed workouts yet. Start a workout to see it here!
      </div>
    </template>
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
