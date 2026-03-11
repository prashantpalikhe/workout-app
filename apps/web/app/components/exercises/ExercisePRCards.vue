<script setup lang="ts">
import type { PersonalRecord } from '~/stores/records'

defineProps<{
  records: PersonalRecord[]
  loading: boolean
}>()

const { formatEnum } = useFormatEnum()

function formatValue(prType: string, value: number): string {
  switch (prType) {
    case 'ONE_REP_MAX':
    case 'MAX_WEIGHT':
      return `${value} kg`
    case 'MAX_REPS':
      return `${value} reps`
    case 'MAX_VOLUME':
      return `${value} kg`
    default:
      return String(value)
  }
}

function prLabel(prType: string): string {
  switch (prType) {
    case 'ONE_REP_MAX': return 'Est. 1RM'
    case 'MAX_WEIGHT': return 'Max Weight'
    case 'MAX_REPS': return 'Max Reps'
    case 'MAX_VOLUME': return 'Max Volume'
    default: return formatEnum(prType)
  }
}

function prIcon(prType: string): string {
  switch (prType) {
    case 'ONE_REP_MAX': return 'i-lucide-trophy'
    case 'MAX_WEIGHT': return 'i-lucide-dumbbell'
    case 'MAX_REPS': return 'i-lucide-repeat'
    case 'MAX_VOLUME': return 'i-lucide-bar-chart-3'
    default: return 'i-lucide-award'
  }
}
</script>

<template>
  <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <USkeleton v-for="i in 4" :key="i" class="h-20 rounded-lg" />
  </div>

  <div
    v-else-if="records.length > 0"
    class="grid grid-cols-2 sm:grid-cols-4 gap-3"
  >
    <UCard v-for="pr in records" :key="pr.id" class="text-center">
      <div class="flex flex-col items-center gap-1">
        <UIcon :name="prIcon(pr.prType)" class="size-5 text-primary" />
        <span class="text-lg font-bold">{{ formatValue(pr.prType, pr.value) }}</span>
        <span class="text-xs text-muted">{{ prLabel(pr.prType) }}</span>
      </div>
    </UCard>
  </div>

  <div
    v-else
    class="text-center py-4 text-sm text-muted"
  >
    No personal records yet. Complete some workouts to set records!
  </div>
</template>
