<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const sessionStore = useSessionStore()
const { formatEnum } = useFormatEnum()

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

const totalSets = computed(() =>
  session.value?.sessionExercises.reduce((sum, ex) => sum + ex.sets.length, 0) ?? 0
)

const completedSets = computed(() =>
  session.value?.sessionExercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0
  ) ?? 0
)

// Determine columns for an exercise's tracking type
function getColumnLabels(trackingType: string) {
  const base = ['Set', 'Type']
  switch (trackingType) {
    case 'WEIGHT_REPS': return [...base, 'Weight (kg)', 'Reps', 'RPE']
    case 'REPS_ONLY': return [...base, 'Reps', 'RPE']
    case 'DURATION': return [...base, 'Duration (s)', 'RPE']
    case 'WEIGHT_DURATION': return [...base, 'Weight (kg)', 'Duration (s)', 'RPE']
    case 'DISTANCE_DURATION': return [...base, 'Distance (km)', 'Duration (s)', 'RPE']
    default: return [...base, 'Weight (kg)', 'Reps', 'RPE']
  }
}

function getSetValues(set: typeof session.value extends null ? never : NonNullable<typeof session.value>['sessionExercises'][0]['sets'][0], trackingType: string) {
  switch (trackingType) {
    case 'WEIGHT_REPS': return [set.weight ?? '-', set.reps ?? '-', set.rpe ?? '-']
    case 'REPS_ONLY': return [set.reps ?? '-', set.rpe ?? '-']
    case 'DURATION': return [set.durationSec ?? '-', set.rpe ?? '-']
    case 'WEIGHT_DURATION': return [set.weight ?? '-', set.durationSec ?? '-', set.rpe ?? '-']
    case 'DISTANCE_DURATION': return [set.distance ?? '-', set.durationSec ?? '-', set.rpe ?? '-']
    default: return [set.weight ?? '-', set.reps ?? '-', set.rpe ?? '-']
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
            <span v-if="duration" class="text-sm text-muted flex items-center gap-1">
              <UIcon name="i-lucide-clock" class="size-3.5" />
              {{ duration }}
            </span>
          </div>
        </template>
        <template #links>
          <NuxtLink to="/sessions">
            <UButton
              label="Back to History"
              icon="i-lucide-arrow-left"
              variant="outline"
            />
          </NuxtLink>
        </template>
      </AppPageHeader>

      <!-- Summary stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">
              {{ session.sessionExercises.length }}
            </p>
            <p class="text-xs text-muted">
              Exercises
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">
              {{ completedSets }}/{{ totalSets }}
            </p>
            <p class="text-xs text-muted">
              Sets Completed
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">
              {{ session.overallRpe ?? '-' }}
            </p>
            <p class="text-xs text-muted">
              RPE
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold">
              {{ duration ?? '-' }}
            </p>
            <p class="text-xs text-muted">
              Duration
            </p>
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
        <UCard
          v-for="exercise in session.sessionExercises"
          :key="exercise.id"
        >
          <!-- Exercise header -->
          <div class="flex items-center gap-2 mb-3">
            <span class="font-medium">{{ exercise.exercise.name }}</span>
            <UBadge
              v-if="exercise.exercise.equipment"
              variant="subtle"
              size="xs"
            >
              {{ formatEnum(exercise.exercise.equipment) }}
            </UBadge>
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
          <p v-if="exercise.notes" class="text-sm text-muted mb-3 flex items-center gap-1.5">
            <UIcon name="i-lucide-message-square" class="size-3.5 shrink-0" />
            {{ exercise.notes }}
          </p>

          <!-- Sets table -->
          <div v-if="exercise.sets.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-default">
                  <th
                    v-for="label in getColumnLabels(exercise.exercise.trackingType)"
                    :key="label"
                    class="text-left text-xs font-medium text-muted py-1 px-2"
                  >
                    {{ label }}
                  </th>
                  <th class="text-left text-xs font-medium text-muted py-1 px-2">
                    Done
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="(set, i) in exercise.sets"
                  :key="set.id"
                >
                  <tr
                    :class="[set.completed ? '' : 'opacity-50', set.notes ? '' : 'border-b border-default last:border-0']"
                  >
                    <td class="py-1.5 px-2">
                      {{ i + 1 }}
                    </td>
                    <td class="py-1.5 px-2">
                      {{ formatEnum(set.setType) }}
                    </td>
                    <td
                      v-for="(val, vi) in getSetValues(set, exercise.exercise.trackingType)"
                      :key="vi"
                      class="py-1.5 px-2"
                    >
                      {{ val }}
                    </td>
                    <td class="py-1.5 px-2 flex items-center gap-1">
                      <UIcon
                        :name="set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                        class="size-4"
                        :class="set.completed ? 'text-success' : 'text-muted'"
                      />
                      <UBadge
                        v-if="set.personalRecord"
                        color="warning"
                        variant="subtle"
                        size="xs"
                      >
                        <UIcon name="i-lucide-trophy" class="size-3" />
                        PR
                      </UBadge>
                    </td>
                  </tr>
                  <tr v-if="set.notes" class="border-b border-default last:border-0">
                    <td :colspan="getColumnLabels(exercise.exercise.trackingType).length + 1" class="py-1 px-2">
                      <p class="text-xs text-muted flex items-center gap-1">
                        <UIcon name="i-lucide-message-square" class="size-3 shrink-0" />
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
    <div v-else class="flex flex-col items-center justify-center py-16 text-center">
      <UIcon name="i-lucide-search-x" class="size-12 text-muted mb-4" />
      <h3 class="text-lg font-medium mb-2">
        Session not found
      </h3>
      <NuxtLink to="/sessions">
        <UButton label="Back to History" variant="outline" />
      </NuxtLink>
    </div>
  </UContainer>
</template>
