<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const sessionStore = useSessionStore()
const { formatEnum } = useFormatEnum()
const { formatWeight, formatWeightValue, formatVolume, weightUnit } = useUnits()

const sessionId = computed(() => route.params.id as string)

onMounted(() => {
  sessionStore.fetchSessionById(sessionId.value)
})

watch(sessionId, (id) => {
  sessionStore.fetchSessionById(id)
})

const session = computed(() => sessionStore.selectedSession)

const duration = computed(() => {
  if (!session.value?.completedAt) return null
  const start = new Date(session.value.startedAt).getTime()
  const end = new Date(session.value.completedAt).getTime()
  const mins = Math.round((end - start) / 60000)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
})

const formattedDate = computed(() => {
  if (!session.value) return ''
  return new Date(session.value.startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
})

const totalVolume = computed(() => {
  if (!session.value) return 0
  let volume = 0
  for (const ex of session.value.sessionExercises) {
    for (const set of ex.sets) {
      if (set.completed && set.weight != null && set.reps != null) {
        volume += set.weight * set.reps
      }
    }
  }
  return volume
})

const prCount = computed(() => {
  if (!session.value) return 0
  let count = 0
  for (const ex of session.value.sessionExercises) {
    for (const set of ex.sets) {
      if (set.personalRecord) count++
    }
  }
  return count
})

const formattedVolume = computed(() => formatVolume(totalVolume.value))

// Determine columns for an exercise's tracking type
function getColumnLabels(trackingType: string) {
  const base = ['Set', 'Type']
  const weightCol = `Weight (${weightUnit.value})`
  switch (trackingType) {
    case 'WEIGHT_REPS':
      return [...base, weightCol, 'Reps', 'RPE']
    case 'REPS_ONLY':
      return [...base, 'Reps', 'RPE']
    case 'DURATION':
      return [...base, 'Duration (s)', 'RPE']
    case 'WEIGHT_DURATION':
      return [...base, weightCol, 'Duration (s)', 'RPE']
    case 'DISTANCE_DURATION':
      return [...base, 'Distance (km)', 'Duration (s)', 'RPE']
    default:
      return [...base, weightCol, 'Reps', 'RPE']
  }
}

interface PrDetail {
  label: string
  description: string
  value: string
  icon: string
}

function getPrDetail(pr: { prType: string, value: number }): PrDetail {
  switch (pr.prType) {
    case 'ONE_REP_MAX':
      return {
        label: 'One Rep Max',
        description: 'Estimated max weight for a single rep',
        value: formatWeight(pr.value),
        icon: 'i-lucide-zap'
      }
    case 'MAX_WEIGHT':
      return {
        label: 'Heaviest Weight',
        description: 'Most weight lifted in a single set',
        value: formatWeight(pr.value),
        icon: 'i-lucide-dumbbell'
      }
    case 'MAX_REPS':
      return {
        label: 'Most Reps',
        description: 'Most reps performed in a single set',
        value: `${pr.value} reps`,
        icon: 'i-lucide-repeat'
      }
    case 'MAX_VOLUME':
      return {
        label: 'Most Volume',
        description: 'Highest weight × reps in a single set',
        value: formatVolume(pr.value),
        icon: 'i-lucide-bar-chart-3'
      }
    default:
      return {
        label: 'Personal Record',
        description: '',
        value: '',
        icon: 'i-lucide-trophy'
      }
  }
}

function getSetValues(
  set: typeof session.value extends null
    ? never
    : NonNullable<typeof session.value>['sessionExercises'][0]['sets'][0],
  trackingType: string
) {
  const weight = formatWeightValue(set.weight) ?? '-'
  switch (trackingType) {
    case 'WEIGHT_REPS':
      return [weight, set.reps ?? '-', set.rpe ?? '-']
    case 'REPS_ONLY':
      return [set.reps ?? '-', set.rpe ?? '-']
    case 'DURATION':
      return [set.durationSec ?? '-', set.rpe ?? '-']
    case 'WEIGHT_DURATION':
      return [weight, set.durationSec ?? '-', set.rpe ?? '-']
    case 'DISTANCE_DURATION':
      return [set.distance ?? '-', set.durationSec ?? '-', set.rpe ?? '-']
    default:
      return [weight, set.reps ?? '-', set.rpe ?? '-']
  }
}
</script>

<template>
  <UContainer>
    <!-- Loading -->
    <div v-if="sessionStore.detailLoading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else-if="session">
      <AppPageHeader :title="session.name" back="/sessions">
        <template #description>
          <div class="flex items-center gap-3 flex-wrap">
            <SessionsSessionStatusBadge :status="session.status" />
            <span class="text-sm text-muted">{{ formattedDate }}</span>
            <span
              v-if="duration"
              class="text-sm text-muted flex items-center gap-1"
            >
              <UIcon name="i-lucide-clock" class="size-3.5" />
              {{ duration }}
            </span>
          </div>
        </template>
      </AppPageHeader>

      <!-- Summary stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <UCard>
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-clock" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xl font-bold leading-tight">
                {{ duration ?? '-' }}
              </p>
              <p class="text-xs text-muted">
                Duration
              </p>
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-weight" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xl font-bold leading-tight">
                {{ formattedVolume }}
              </p>
              <p class="text-xs text-muted">
                Volume
              </p>
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-flame" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xl font-bold leading-tight">
                {{ session.overallRpe ?? '-' }}
              </p>
              <p class="text-xs text-muted">
                RPE
              </p>
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-trophy" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xl font-bold leading-tight">
                {{ prCount || '-' }}
              </p>
              <p class="text-xs text-muted">
                PRs
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Notes -->
      <UCard v-if="session.notes" class="mb-6">
        <div>
          <p class="text-sm font-medium mb-1">
            Notes
          </p>
          <p class="text-sm text-muted">
            {{ session.notes }}
          </p>
        </div>
      </UCard>

      <!-- Exercises -->
      <div class="space-y-4">
        <UCard v-for="exercise in session.sessionExercises" :key="exercise.id">
          <!-- Exercise header -->
          <div class="flex items-center gap-2 mb-3">
            <NuxtLink
              :to="`/exercises/${exercise.exerciseId}`"
              class="flex items-center gap-2 min-w-0 group"
            >
              <img
                v-if="exercise.exercise.imageUrls?.[0]"
                :src="exercise.exercise.imageUrls[0]"
                :alt="exercise.exercise.name"
                class="size-9 rounded-full object-cover shrink-0 bg-elevated"
              >
              <div
                v-else
                class="size-9 rounded-full bg-elevated flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-dumbbell" class="size-4 text-muted" />
              </div>
              <span class="font-medium text-primary group-hover:underline truncate">{{ exercise.exercise.name }}</span>
            </NuxtLink>
            <UBadge
              v-if="exercise.isSubstitution"
              color="warning"
              variant="subtle"
              size="xs"
            >
              Substituted
            </UBadge>
          </div>

          <!-- Exercise notes -->
          <p
            v-if="exercise.notes"
            class="text-sm text-muted mb-3 flex items-center gap-1.5"
          >
            <UIcon name="i-lucide-message-square" class="size-3.5 shrink-0" />
            {{ exercise.notes }}
          </p>

          <!-- Sets table -->
          <div v-if="exercise.sets.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-default">
                  <th
                    v-for="label in getColumnLabels(
                      exercise.exercise.trackingType
                    )"
                    :key="label"
                    class="text-left text-xs font-medium text-muted py-1 px-2"
                  >
                    {{ label }}
                  </th>
                  <th
                    class="text-left text-xs font-medium text-muted py-1 px-2"
                  >
                    Done
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(set, i) in exercise.sets" :key="set.id">
                  <tr
                    :class="[
                      set.completed ? '' : 'opacity-50',
                      set.notes ? '' : 'border-b border-default last:border-0'
                    ]"
                  >
                    <td class="py-1.5 px-2">
                      {{ i + 1 }}
                    </td>
                    <td class="py-1.5 px-2">
                      {{ formatEnum(set.setType) }}
                    </td>
                    <td
                      v-for="(val, vi) in getSetValues(
                        set,
                        exercise.exercise.trackingType
                      )"
                      :key="vi"
                      class="py-1.5 px-2"
                    >
                      {{ val }}
                    </td>
                    <td class="py-1.5 px-2 flex items-center gap-1">
                      <UIcon
                        :name="
                          set.completed
                            ? 'i-lucide-check-circle-2'
                            : 'i-lucide-circle'
                        "
                        class="size-4"
                        :class="set.completed ? 'text-success' : 'text-muted'"
                      />
                      <UPopover v-if="set.personalRecord">
                        <template #default>
                          <UBadge
                            color="warning"
                            variant="subtle"
                            size="xs"
                            class="cursor-pointer"
                          >
                            <UIcon name="i-lucide-trophy" class="size-3" />
                            PR
                          </UBadge>
                        </template>
                        <template #content>
                          <div class="p-3 max-w-64">
                            <div class="flex items-center gap-2 mb-1">
                              <UIcon
                                :name="getPrDetail(set.personalRecord).icon"
                                class="size-4 text-warning"
                              />
                              <p class="text-sm font-semibold">
                                {{ getPrDetail(set.personalRecord).label }}
                              </p>
                            </div>
                            <p class="text-lg font-bold text-warning mb-1">
                              {{ getPrDetail(set.personalRecord).value }}
                            </p>
                            <p class="text-xs text-muted">
                              {{ getPrDetail(set.personalRecord).description }}
                            </p>
                          </div>
                        </template>
                      </UPopover>
                    </td>
                  </tr>
                  <tr
                    v-if="set.notes"
                    class="border-b border-default last:border-0"
                  >
                    <td
                      :colspan="
                        getColumnLabels(exercise.exercise.trackingType).length
                          + 1
                      "
                      class="py-1 px-2"
                    >
                      <p class="text-xs text-muted flex items-center gap-1">
                        <UIcon
                          name="i-lucide-message-square"
                          class="size-3 shrink-0"
                        />
                        {{ set.notes }}
                      </p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <p v-else class="text-sm text-muted">
            No sets logged
          </p>

          <p v-if="exercise.substitutionReason" class="text-xs text-muted mt-2">
            Substitution reason: {{ exercise.substitutionReason }}
          </p>
        </UCard>
      </div>
    </div>

    <!-- Not found -->
    <AppEmptyState v-else icon="i-lucide-search-x" title="Session not found" />
  </UContainer>
</template>
