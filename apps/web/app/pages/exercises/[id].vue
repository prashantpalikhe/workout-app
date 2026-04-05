<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const exerciseStore = useExerciseStore()
const recordsStore = useRecordsStore()
const { formatEnum } = useFormatEnum()

const exerciseId = computed(() => route.params.id as string)

const exercise = computed(() => exerciseStore.selectedExercise)

const activeTab = ref('statistics')
const tabs = [
  { label: 'Statistics', value: 'statistics', icon: 'i-lucide-bar-chart-3' },
  { label: 'History', value: 'history', icon: 'i-lucide-history' }
]

const primaryMuscles = computed(() =>
  exercise.value?.muscleGroups.filter(mg => mg.role === 'PRIMARY') ?? []
)
const secondaryMuscles = computed(() =>
  exercise.value?.muscleGroups.filter(mg => mg.role === 'SECONDARY') ?? []
)

const videoEmbedUrl = computed(() => {
  if (!exercise.value?.videoUrl) return null
  const url = exercise.value.videoUrl
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  return url
})

onMounted(async () => {
  await exerciseStore.fetchExerciseById(exerciseId.value)
  await Promise.all([
    exerciseStore.fetchExerciseStats(exerciseId.value),
    exerciseStore.fetchExerciseHistory(exerciseId.value),
    recordsStore.fetchByExercise(exerciseId.value)
  ])
})

watch(exerciseId, async (id) => {
  await exerciseStore.fetchExerciseById(id)
  await Promise.all([
    exerciseStore.fetchExerciseStats(id),
    exerciseStore.fetchExerciseHistory(id),
    recordsStore.fetchByExercise(id)
  ])
})

function onRangeChange(range: string) {
  exerciseStore.fetchExerciseStats(exerciseId.value, range)
}

function onHistoryPage(page: number) {
  exerciseStore.fetchExerciseHistory(exerciseId.value, page)
}
</script>

<template>
  <UContainer>
    <!-- Loading -->
    <div v-if="exerciseStore.detailLoading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else-if="exercise">
      <AppPageHeader :title="exercise.name">
        <template #description>
          <div class="flex items-center gap-2 flex-wrap">
            <UBadge variant="subtle" size="sm">
              {{ formatEnum(exercise.trackingType) }}
            </UBadge>
            <UBadge v-if="exercise.equipment" color="neutral" variant="subtle" size="sm">
              {{ formatEnum(exercise.equipment) }}
            </UBadge>
            <UBadge v-if="exercise.movementPattern" color="neutral" variant="subtle" size="sm">
              {{ formatEnum(exercise.movementPattern) }}
            </UBadge>
            <UBadge v-if="!exercise.isGlobal" color="primary" variant="subtle" size="sm">
              Custom
            </UBadge>
          </div>
        </template>
        <template #links>
          <NuxtLink to="/exercises">
            <UButton
              label="Back to Library"
              icon="i-lucide-arrow-left"
              variant="outline"
            />
          </NuxtLink>
        </template>
      </AppPageHeader>

      <!-- Exercise details -->
      <UCard class="mb-6">
        <div class="space-y-4">
          <!-- Muscle groups -->
          <div v-if="exercise.muscleGroups.length > 0">
            <div v-if="primaryMuscles.length > 0" class="mb-2">
              <p class="text-xs text-muted mb-1">
                Primary Muscles
              </p>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="mg in primaryMuscles"
                  :key="mg.id"
                  variant="subtle"
                  size="sm"
                >
                  {{ mg.muscleGroup.name }}
                </UBadge>
              </div>
            </div>
            <div v-if="secondaryMuscles.length > 0">
              <p class="text-xs text-muted mb-1">
                Secondary Muscles
              </p>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="mg in secondaryMuscles"
                  :key="mg.id"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ mg.muscleGroup.name }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Instructions -->
          <div v-if="exercise.instructions">
            <p class="text-xs text-muted mb-1">
              Instructions
            </p>
            <p class="text-sm whitespace-pre-line">
              {{ exercise.instructions }}
            </p>
          </div>

          <!-- Video -->
          <div v-if="videoEmbedUrl">
            <p class="text-xs text-muted mb-1">
              Video
            </p>
            <div class="aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                :src="videoEmbedUrl"
                class="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- PR Summary Cards -->
      <div class="mb-6">
        <ExercisesExercisePRCards
          :records="recordsStore.exercisePRs"
          :loading="recordsStore.exercisePRsLoading"
        />
      </div>

      <!-- Tabs -->
      <UTabs
        v-model="activeTab"
        :items="tabs"
        :content="false"
      />

      <div class="pt-4">
        <ExercisesExerciseStatsChart
          v-if="activeTab === 'statistics'"
          :data="exerciseStore.exerciseStats"
          :loading="exerciseStore.statsLoading"
          :tracking-type="exercise.trackingType"
          @update:range="onRangeChange"
        />
        <ExercisesExerciseHistoryList
          v-else-if="activeTab === 'history'"
          :sessions="exerciseStore.exerciseHistory"
          :loading="exerciseStore.historyLoading"
          :tracking-type="exercise.trackingType"
          :meta="exerciseStore.exerciseHistoryMeta"
          @update:page="onHistoryPage"
        />
      </div>
    </div>

    <!-- Not found -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
      <h3 class="text-lg font-medium mb-2">
        Exercise not found
      </h3>
      <NuxtLink to="/exercises">
        <UButton label="Back to Library" variant="outline" />
      </NuxtLink>
    </div>
  </UContainer>
</template>
