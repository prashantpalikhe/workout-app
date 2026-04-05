<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const recordsStore = useRecordsStore()
const { formatEnum } = useFormatEnum()

onMounted(() => {
  recordsStore.fetchRecords()
})

// Group records by exercise name
const groupedRecords = computed(() => {
  const groups: Record<string, typeof recordsStore.records> = {}
  for (const record of recordsStore.records) {
    if (!groups[record.exerciseName]) {
      groups[record.exerciseName] = []
    }
    groups[record.exerciseName].push(record)
  }
  return groups
})

function prLabel(prType: string): string {
  switch (prType) {
    case 'ONE_REP_MAX': return 'Est. 1RM'
    case 'MAX_WEIGHT': return 'Max Weight'
    case 'MAX_REPS': return 'Max Reps'
    case 'MAX_VOLUME': return 'Max Volume'
    default: return formatEnum(prType)
  }
}

function formatValue(prType: string, value: number): string {
  switch (prType) {
    case 'ONE_REP_MAX':
    case 'MAX_WEIGHT':
      return `${value} kg`
    case 'MAX_REPS':
      return `${value} reps`
    case 'MAX_VOLUME':
      return `${value.toLocaleString()} kg`
    default:
      return String(value)
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <UContainer>
    <UPageHeader
      title="Personal Records"
      description="Your best performances across all exercises"
    />

    <!-- Loading -->
    <div v-if="recordsStore.loading" class="space-y-4">
      <USkeleton v-for="i in 3" :key="i" class="h-32 w-full rounded-lg" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="recordsStore.records.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-lucide-trophy" class="size-12 text-muted mb-4" />
      <h3 class="text-lg font-medium mb-2">
        No personal records yet
      </h3>
      <p class="text-sm text-muted mb-4">
        Complete workouts to start setting personal records.
      </p>
      <NuxtLink to="/sessions">
        <UButton label="View Sessions" variant="outline" />
      </NuxtLink>
    </div>

    <!-- Records grouped by exercise -->
    <div v-else class="space-y-4">
      <UCard
        v-for="(records, exerciseName) in groupedRecords"
        :key="exerciseName"
      >
        <div class="flex items-center justify-between mb-3">
          <NuxtLink
            :to="`/exercises/${records[0].exerciseId}`"
            class="font-medium hover:text-primary transition-colors"
          >
            {{ exerciseName }}
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="pr in records"
            :key="pr.id"
            class="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
          >
            <UIcon :name="prIcon(pr.prType)" class="size-5 text-primary shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-semibold">
                {{ formatValue(pr.prType, pr.value) }}
              </p>
              <p class="text-xs text-muted">
                {{ prLabel(pr.prType) }}
              </p>
              <p class="text-xs text-muted">
                {{ formatDate(pr.achievedOn) }}
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Pagination -->
      <div
        v-if="recordsStore.meta.totalPages > 1"
        class="flex justify-center"
      >
        <UPagination
          :page="recordsStore.meta.page"
          :total="recordsStore.meta.total"
          :items-per-page="recordsStore.meta.limit"
          @update:page="recordsStore.setPage"
        />
      </div>
    </div>
  </UContainer>
</template>
