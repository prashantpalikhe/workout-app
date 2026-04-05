<script setup lang="ts">
import type { UserStatsResponse } from '@workout/shared'

const props = defineProps<{
  stats: UserStatsResponse | null
  loading: boolean
}>()

const formattedVolume = computed(() => {
  if (!props.stats) return '0'
  const v = props.stats.totalVolume
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return v.toLocaleString()
})
</script>

<template>
  <div v-if="!loading" class="grid grid-cols-3 gap-3">
    <div class="text-center p-4 rounded-lg bg-elevated/50">
      <div class="text-2xl font-bold">
        {{ stats?.totalWorkouts ?? 0 }}
      </div>
      <div class="text-xs text-muted mt-1">
        Workouts
      </div>
    </div>

    <div class="text-center p-4 rounded-lg bg-elevated/50">
      <div class="text-2xl font-bold">
        {{ formattedVolume }}
      </div>
      <div class="text-xs text-muted mt-1">
        Volume (kg)
      </div>
    </div>

    <div class="text-center p-4 rounded-lg bg-elevated/50">
      <div class="flex items-center justify-center gap-1">
        <UIcon
          v-if="(stats?.currentStreak ?? 0) > 0"
          name="i-lucide-flame"
          class="size-5 text-orange-500"
        />
        <span class="text-2xl font-bold">{{ stats?.currentStreak ?? 0 }}</span>
      </div>
      <div class="text-xs text-muted mt-1">
        Day Streak
      </div>
    </div>
  </div>
</template>
