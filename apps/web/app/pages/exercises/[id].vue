<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const exerciseStore = useExerciseStore()
const recordsStore = useRecordsStore()
const { formatEnum } = useFormatEnum()

const exerciseId = computed(() => route.params.id as string)

const exercise = computed(() => exerciseStore.selectedExercise)

const activeTab = ref('statistics')
const tabs = computed(() => {
  const t = [
    { label: 'Statistics', value: 'statistics' },
    { label: 'History', value: 'history' }
  ]
  if (exercise.value?.instructions.length) {
    t.push({ label: 'Instructions', value: 'instructions' })
  }
  return t
})

const primaryMuscles = computed(() =>
  exercise.value?.muscleGroups.filter(mg => mg.role === 'PRIMARY') ?? []
)
const secondaryMuscles = computed(() =>
  exercise.value?.muscleGroups.filter(mg => mg.role === 'SECONDARY') ?? []
)

// Image carousel
const carouselRef = ref()
const currentSlide = ref(0)
function onSlideChange(index: number) {
  currentSlide.value = index
}

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
      <AppPageHeader :title="exercise.name" back="/exercises">
        <template #description>
          <div class="flex items-center gap-2 flex-wrap">
            <UBadge variant="subtle" size="sm">
              {{ formatEnum(exercise.trackingType) }}
            </UBadge>
            <UBadge v-if="!exercise.isGlobal" color="primary" variant="subtle" size="sm">
              Custom
            </UBadge>
          </div>
        </template>
      </AppPageHeader>

      <!-- Exercise info card — image + metadata in one box -->
      <UCard class="mb-6">
        <div class="md:grid md:grid-cols-2 md:gap-6">
          <!-- Image carousel (first on mobile, right on desktop via order) -->
          <div v-if="exercise.imageUrls.length" class="md:order-2 -mx-4 -mt-4 md:m-0 mb-4 md:mb-0">
            <div class="relative group">
              <UCarousel
                ref="carouselRef"
                v-slot="{ item }"
                :items="exercise.imageUrls"
                class="rounded-none md:rounded-lg overflow-hidden"
                :ui="{ container: '-ms-0', item: 'ps-0' }"
                @select="onSlideChange"
              >
                <img :src="item" :alt="exercise.name" class="w-full aspect-[4/3] object-cover bg-elevated">
              </UCarousel>

              <!-- Custom navigation (only when multiple images) -->
              <template v-if="exercise.imageUrls.length > 1">
                <!-- Prev / Next buttons -->
                <button
                  class="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-all"
                  aria-label="Previous image"
                  @click="carouselRef?.emblaApi?.scrollPrev()"
                >
                  <UIcon name="i-lucide-chevron-left" class="size-5" />
                </button>
                <button
                  class="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-all"
                  aria-label="Next image"
                  @click="carouselRef?.emblaApi?.scrollNext()"
                >
                  <UIcon name="i-lucide-chevron-right" class="size-5" />
                </button>

                <!-- Counter badge -->
                <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs backdrop-blur-sm">
                  {{ currentSlide + 1 }} / {{ exercise.imageUrls.length }}
                </div>
              </template>
            </div>
          </div>

          <!-- Metadata (second on mobile, left on desktop) -->
          <div class="md:order-1 space-y-3">
            <div v-if="exercise.equipment">
              <p class="text-xs text-muted mb-1">Equipment</p>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ formatEnum(exercise.equipment) }}
              </UBadge>
            </div>

            <div v-if="exercise.movementPattern">
              <p class="text-xs text-muted mb-1">Movement Pattern</p>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ formatEnum(exercise.movementPattern) }}
              </UBadge>
            </div>

            <div v-if="primaryMuscles.length > 0">
              <p class="text-xs text-muted mb-1">Primary Muscles</p>
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
              <p class="text-xs text-muted mb-1">Secondary Muscles</p>
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
        </div>
      </UCard>

      <!-- Video -->
      <UCard v-if="videoEmbedUrl" class="mb-6">
        <p class="text-xs text-muted mb-1">Video</p>
        <div class="aspect-video rounded-lg overflow-hidden bg-muted">
          <iframe
            :src="videoEmbedUrl"
            class="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
      </UCard>

      <!-- PR Summary Cards (only when records exist) -->
      <div v-if="recordsStore.exercisePRsLoading || recordsStore.exercisePRs.length" class="mb-6">
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
        <ol
          v-else-if="activeTab === 'instructions'"
          class="list-decimal list-inside space-y-2 text-sm px-4"
        >
          <li v-for="(step, i) in exercise.instructions" :key="i">
            {{ step }}
          </li>
        </ol>
      </div>
    </div>

    <!-- Not found -->
    <AppEmptyState
      v-else
      icon="i-lucide-search-x"
      title="Exercise not found"
    />
  </UContainer>
</template>
