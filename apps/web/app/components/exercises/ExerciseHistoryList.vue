<script setup lang="ts">
import type { ExerciseHistorySession } from '@workout/shared'

defineProps<{
  sessions: ExerciseHistorySession[]
  loading: boolean
  trackingType: string
  meta: { page: number; limit: number; total: number; totalPages: number }
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const { formatEnum } = useFormatEnum()

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getColumnLabels(trackingType: string) {
  const base = ['Set', 'Type']
  switch (trackingType) {
    case 'WEIGHT_REPS':
      return [...base, 'Weight (kg)', 'Reps', 'RPE']
    case 'REPS_ONLY':
      return [...base, 'Reps', 'RPE']
    case 'DURATION':
      return [...base, 'Duration (s)', 'RPE']
    case 'WEIGHT_DURATION':
      return [...base, 'Weight (kg)', 'Duration (s)', 'RPE']
    case 'DISTANCE_DURATION':
      return [...base, 'Distance (km)', 'Duration (s)', 'RPE']
    default:
      return [...base, 'Weight (kg)', 'Reps', 'RPE']
  }
}

function getSetValues(
  set: ExerciseHistorySession['sets'][0],
  trackingType: string
) {
  switch (trackingType) {
    case 'WEIGHT_REPS':
      return [set.weight ?? '-', set.reps ?? '-', set.rpe ?? '-']
    case 'REPS_ONLY':
      return [set.reps ?? '-', set.rpe ?? '-']
    case 'DURATION':
      return [set.durationSec ?? '-', set.rpe ?? '-']
    case 'WEIGHT_DURATION':
      return [set.weight ?? '-', set.durationSec ?? '-', set.rpe ?? '-']
    case 'DISTANCE_DURATION':
      return [set.distance ?? '-', set.durationSec ?? '-', set.rpe ?? '-']
    default:
      return [set.weight ?? '-', set.reps ?? '-', set.rpe ?? '-']
  }
}

function prLabel(prType: string): string {
  switch (prType) {
    case 'ONE_REP_MAX':
      return '1RM'
    case 'MAX_WEIGHT':
      return 'Weight'
    case 'MAX_REPS':
      return 'Reps'
    case 'MAX_VOLUME':
      return 'Volume'
    default:
      return 'PR'
  }
}
</script>

<template>
  <div>
    <template v-if="loading">
      <div class="flex justify-center py-12">
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-muted"
        />
      </div>
    </template>

    <AppEmptyState
      v-else-if="sessions.length === 0"
      icon="i-lucide-history"
      title="No session history yet"
      description="Complete workouts with this exercise to see history."
    />

    <template v-else>
      <div class="space-y-3">
        <UCard v-for="session in sessions" :key="session.sessionId">
          <div class="flex items-center justify-between mb-3">
            <div>
              <NuxtLink
                :to="`/sessions/${session.sessionId}`"
                class="font-medium hover:text-primary transition-colors"
              >
                {{ session.sessionName }}
              </NuxtLink>
              <p class="text-xs text-muted">
                {{ formatDate(session.date) }}
              </p>
            </div>
            <UBadge variant="subtle" size="xs">
              {{ session.sets.length }}
              {{ session.sets.length === 1 ? 'set' : 'sets' }}
            </UBadge>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-default">
                  <th
                    v-for="label in getColumnLabels(trackingType)"
                    :key="label"
                    class="text-left text-xs font-medium text-muted py-1 px-2"
                  >
                    {{ label }}
                  </th>
                  <th
                    class="text-left text-xs font-medium text-muted py-1 px-2"
                  />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="set in session.sets"
                  :key="set.id"
                  class="border-b border-default last:border-0"
                  :class="set.completed ? '' : 'opacity-50'"
                >
                  <td class="py-1.5 px-2">
                    {{ set.setNumber }}
                  </td>
                  <td class="py-1.5 px-2">
                    {{ formatEnum(set.setType) }}
                  </td>
                  <td
                    v-for="(val, vi) in getSetValues(set, trackingType)"
                    :key="vi"
                    class="py-1.5 px-2"
                  >
                    {{ val }}
                  </td>
                  <td class="py-1.5 px-2">
                    <UBadge
                      v-if="set.personalRecord"
                      color="warning"
                      variant="subtle"
                      size="xs"
                    >
                      <UIcon name="i-lucide-trophy" class="size-3 mr-0.5" />
                      {{ prLabel(set.personalRecord.prType) }}
                    </UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>

      <div v-if="meta.totalPages > 1" class="flex justify-center mt-4">
        <UPagination
          :page="meta.page"
          :total="meta.total"
          :items-per-page="meta.limit"
          @update:page="emit('update:page', $event)"
        />
      </div>
    </template>
  </div>
</template>
