<script setup lang="ts">
import type { WorkoutSession } from '~/stores/sessions'

const props = defineProps<{
  session: WorkoutSession
}>()

const duration = computed(() => {
  if (!props.session.completedAt) return null
  const start = new Date(props.session.startedAt).getTime()
  const end = new Date(props.session.completedAt).getTime()
  const mins = Math.round((end - start) / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
})

const exerciseCount = computed(() => props.session.sessionExercises.length)

const formattedDate = computed(() => {
  return new Date(props.session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

const totalSets = computed(() =>
  props.session.sessionExercises.reduce((sum, ex) => sum + ex.sets.length, 0)
)
</script>

<template>
  <NuxtLink :to="`/sessions/${session.id}`" class="block">
    <div class="flex items-center justify-between gap-3 p-4 border border-default rounded-lg hover:bg-elevated/50 transition-colors cursor-pointer">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="font-medium truncate">{{ session.name }}</span>
          <SessionsSessionStatusBadge :status="session.status" />
        </div>
        <p class="text-sm text-muted">{{ formattedDate }}</p>
        <div class="flex items-center gap-3 mt-1.5 text-xs text-muted">
          <span v-if="duration" class="flex items-center gap-1">
            <UIcon name="i-lucide-clock" class="size-3.5" />
            {{ duration }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-dumbbell" class="size-3.5" />
            {{ exerciseCount }} exercise{{ exerciseCount !== 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-layers" class="size-3.5" />
            {{ totalSets }} set{{ totalSets !== 1 ? 's' : '' }}
          </span>
          <span v-if="session.overallRpe" class="flex items-center gap-1">
            RPE {{ session.overallRpe }}
          </span>
        </div>
      </div>
      <UIcon name="i-lucide-chevron-right" class="size-5 text-muted shrink-0" />
    </div>
  </NuxtLink>
</template>
