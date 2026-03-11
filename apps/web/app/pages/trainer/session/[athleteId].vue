<script setup lang="ts">
import type { SessionExercise } from '~/stores/sessions'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const trainerStore = useTrainerStore()
const toast = useToast()

const athleteId = route.params.athleteId as string

const showExercisePicker = ref(false)
const showCompleteModal = ref(false)
const showAbandonDialog = ref(false)
const showSubstituteModal = ref(false)
const substitutingExercise = ref<SessionExercise | null>(null)
const athleteName = ref('')

// ── Rest Timer ──────────────────────────────────
const { restTimerEnabled, defaultRestSec, fetch: fetchSettings } = useUserSettings()
const restTimer = useRestTimer()

const session = computed(() => sessionStore.activeSession)

onMounted(async () => {
  // Enter trainer mode — this makes the session store route through trainer endpoints
  sessionStore.enterTrainerMode(athleteId)

  await Promise.all([
    sessionStore.fetchActive(),
    fetchSettings(),
    trainerStore.fetchAthleteProfile(athleteId).then((profile) => {
      if (profile) {
        athleteName.value = `${profile.firstName} ${profile.lastName}`
      }
    }),
  ])
})

onBeforeUnmount(() => {
  sessionStore.exitTrainerMode()
})

function onSetCompleted(data: { setRestSec: number | null; exerciseRestSec: number | null }) {
  if (!restTimerEnabled.value) return

  const seconds = restTimer.sessionDefault.value
    ?? data.setRestSec
    ?? data.exerciseRestSec
    ?? defaultRestSec.value

  if (seconds > 0) {
    restTimer.start(seconds)
  }
}

function onTimerSetDuration(seconds: number) {
  restTimer.setDuration(seconds)
  restTimer.start(seconds)
}

function openSubstitute(exercise: SessionExercise) {
  substitutingExercise.value = exercise
  showSubstituteModal.value = true
}

async function removeExercise(exercise: SessionExercise) {
  if (!session.value) return
  try {
    await sessionStore.removeExercise(session.value.id, exercise.id)
    toast.add({ title: `${exercise.exercise.name} removed`, color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to remove exercise', color: 'error' })
  }
}

function onCompleted() {
  router.push(`/trainer/athletes/${athleteId}`)
}

function onAbandoned() {
  router.push(`/trainer/athletes/${athleteId}`)
}

const dropdownItems = computed(() => [
  [
    {
      label: 'Abandon Workout',
      icon: 'i-lucide-x-circle',
      color: 'error' as const,
      onSelect: () => { showAbandonDialog.value = true },
    },
  ],
])
</script>

<template>
  <UContainer>
    <!-- Trainer Banner -->
    <div
      v-if="athleteName"
      class="mb-4 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-sm"
    >
      <UIcon name="i-lucide-user-check" class="size-4 text-primary shrink-0" />
      <span>
        Logging workout for <span class="font-semibold">{{ athleteName }}</span>
      </span>
    </div>

    <!-- Loading -->
    <div v-if="sessionStore.activeLoading" class="py-8">
      <USkeleton class="h-12 w-64 mb-4" />
      <USkeleton class="h-48 w-full rounded-lg mb-3" />
      <USkeleton class="h-48 w-full rounded-lg" />
    </div>

    <!-- No active session -->
    <div
      v-else-if="!session"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-lucide-dumbbell" class="size-12 text-muted mb-4" />
      <h3 class="text-lg font-medium mb-2">No active workout</h3>
      <p class="text-sm text-muted mb-6">
        This athlete doesn't have an active session. Start one from their profile.
      </p>
      <UButton
        label="Back to Athlete"
        icon="i-lucide-arrow-left"
        variant="outline"
        :to="`/trainer/athletes/${athleteId}`"
      />
    </div>

    <!-- Active session -->
    <div v-else>
      <UPageHeader :title="session.name">
        <template #description>
          <SessionsSessionTimer :started-at="session.startedAt" />
        </template>
        <template #links>
          <UButton
            label="Add Exercise"
            icon="i-lucide-plus"
            variant="outline"
            @click="showExercisePicker = true"
          />
          <UButton
            label="Finish"
            icon="i-lucide-check-circle"
            color="success"
            @click="showCompleteModal = true"
          />
          <UDropdownMenu :items="dropdownItems">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </template>
      </UPageHeader>

      <!-- Exercise list -->
      <div
        v-if="session.sessionExercises.length > 0"
        class="space-y-4"
      >
        <SessionsSessionExerciseCard
          v-for="exercise in session.sessionExercises"
          :key="exercise.id"
          :session-id="session.id"
          :exercise="exercise"
          @substitute="openSubstitute(exercise)"
          @remove="removeExercise(exercise)"
          @set-completed="onSetCompleted"
        />
      </div>

      <!-- Empty exercise state -->
      <div
        v-else
        class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-default rounded-lg"
      >
        <UIcon name="i-lucide-plus-circle" class="size-10 text-muted mb-3" />
        <p class="text-sm text-muted mb-4">
          Add the first exercise to get started
        </p>
        <UButton
          label="Add Exercise"
          icon="i-lucide-plus"
          variant="outline"
          @click="showExercisePicker = true"
        />
      </div>

      <!-- Bottom spacer for rest timer overlay -->
      <div
        v-if="restTimer.isRunning.value || restTimer.isCompleted.value"
        class="h-28"
      />
    </div>

    <!-- Modals (reuse existing session components — they call sessionStore which is in trainer mode) -->
    <SessionsSessionExercisePicker
      v-if="session"
      v-model="showExercisePicker"
      :session-id="session.id"
      :existing-exercise-ids="new Set(session.sessionExercises.map(e => e.exerciseId))"
    />
    <SessionsSessionCompleteModal
      v-if="session"
      v-model="showCompleteModal"
      :session="session"
      @completed="onCompleted"
    />
    <SessionsSessionAbandonDialog
      v-if="session"
      v-model="showAbandonDialog"
      :session="session"
      @abandoned="onAbandoned"
    />
    <SessionsSessionSubstituteModal
      v-if="session && substitutingExercise"
      v-model="showSubstituteModal"
      :session-id="session.id"
      :exercise="substitutingExercise"
    />

    <!-- Rest Timer Overlay -->
    <SessionsRestTimerOverlay
      :is-running="restTimer.isRunning.value"
      :is-completed="restTimer.isCompleted.value"
      :remaining="restTimer.remaining.value"
      :total="restTimer.total.value"
      :progress="restTimer.progress.value"
      :formatted-time="restTimer.formattedTime.value"
      @skip="restTimer.skip()"
      @add-time="restTimer.addTime($event)"
      @set-duration="onTimerSetDuration"
    />
  </UContainer>
</template>
