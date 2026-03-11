<script setup lang="ts">
import type { ExerciseHistorySession } from '@workout/shared'

defineProps<{
  athleteName: string
  exerciseName: string
  history: ExerciseHistorySession[]
  loading: boolean
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatSetSummary(set: ExerciseHistorySession['sets'][number]) {
  const parts: string[] = []
  if (set.weight != null) parts.push(`${set.weight}kg`)
  if (set.reps != null) parts.push(`×${set.reps}`)
  if (set.durationSec != null) parts.push(`${set.durationSec}s`)
  if (set.distance != null) parts.push(`${set.distance}km`)
  return parts.join(' ') || '—'
}
</script>

<template>
  <USlideover :open="open" :title="`${exerciseName} — ${athleteName}`" @update:open="emit('update:open', $event)">
    <template #body>
      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="space-y-2">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="history.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-history" class="size-10 text-muted mb-3" />
        <p class="text-sm text-muted">No history for this exercise yet</p>
      </div>

      <!-- History list -->
      <div v-else class="space-y-5">
        <div
          v-for="session in history"
          :key="session.sessionId"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">{{ session.sessionName }}</p>
            <span class="text-xs text-muted">{{ formatDate(session.date) }}</span>
          </div>

          <div class="space-y-1">
            <div
              v-for="set in session.sets"
              :key="set.id"
              class="flex items-center gap-2 text-sm px-2 py-0.5 rounded"
              :class="set.completed ? '' : 'opacity-40'"
            >
              <span class="text-xs text-muted w-5 text-center shrink-0">
                {{ set.setNumber }}
              </span>
              <span class="flex-1">{{ formatSetSummary(set) }}</span>
              <span v-if="set.rpe" class="text-xs text-muted">
                RPE {{ set.rpe }}
              </span>
              <UBadge
                v-if="set.personalRecord"
                :label="set.personalRecord.prType"
                color="warning"
                variant="subtle"
                size="xs"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
