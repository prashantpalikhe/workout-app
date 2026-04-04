<script setup lang="ts">
import type { SessionExercise } from '~/stores/sessions'

definePageMeta({ middleware: 'auth' })

const sessionStore = useSessionStore()
const router = useRouter()
const toast = useToast()

const showStartModal = ref(false)
const showExercisePicker = ref(false)
const showCompleteModal = ref(false)
const showAbandonDialog = ref(false)
const showSubstituteModal = ref(false)
const substitutingExercise = ref<SessionExercise | null>(null)

// ── Rest Timer ──────────────────────────────────
const { restTimerEnabled, defaultRestSec, fetch: fetchSettings } = useUserSettings()
const restTimer = useRestTimer()

const session = computed(() => sessionStore.activeSession)

// ── Mobile header title override ───────────────
const mobileHeaderTitle = useState<string>('mobile-header-title')

watch(session, (s) => {
  mobileHeaderTitle.value = s?.name ?? ''
}, { immediate: true })

onUnmounted(() => {
  mobileHeaderTitle.value = ''
})

// Session-level notes
const showSessionNotes = ref(false)
const sessionNotesText = ref('')

watch(session, (s) => {
  if (s) {
    sessionNotesText.value = s.notes ?? ''
    showSessionNotes.value = !!s.notes
  }
}, { immediate: true })

const { schedule: scheduleSessionNoteSave } = useAutoSave(
  async () => {
    if (session.value) {
      await sessionStore.updateSession(session.value.id, {
        notes: sessionNotesText.value.trim() || undefined,
      })
    }
  },
  { debounceMs: 600 },
)

onMounted(async () => {
  await Promise.all([
    sessionStore.fetchActive(),
    fetchSettings()
  ])
})

function onSetCompleted(data: { setRestSec: number | null, exerciseRestSec: number | null }) {
  if (!restTimerEnabled.value) return

  // Resolution: session-sticky override → set rest → exercise prescription → user default
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
  // Restart timer with new duration
  restTimer.start(seconds)
}

function onSessionStarted() {
  // Session already set in store by startSession action
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

function onCompleted(sessionId: string) {
  router.push(`/sessions/${sessionId}`)
}

function onAbandoned() {
  router.push('/sessions')
}

const dropdownItems = computed(() => [
  [
    {
      label: 'Session Notes',
      icon: 'i-lucide-message-square',
      onSelect: () => { showSessionNotes.value = !showSessionNotes.value },
    },
    {
      label: 'Abandon Workout',
      icon: 'i-lucide-x-circle',
      color: 'error' as const,
      onSelect: () => { showAbandonDialog.value = true },
    },
  ],
])

// ── Stats ──────────────────────────────────────
const totalSets = computed(() => {
  if (!session.value) return 0
  return session.value.sessionExercises.reduce(
    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
    0,
  )
})

const totalVolume = computed(() => {
  if (!session.value) return 0
  return session.value.sessionExercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter(s => s.completed && s.weight && s.reps)
        .reduce((s, set) => s + (set.weight! * set.reps!), 0),
    0,
  )
})

const formattedVolume = computed(() => {
  const v = totalVolume.value
  if (v >= 1000) return `${(v / 1000).toFixed(1)}t`
  return `${Math.round(v)} kg`
})
</script>

<template>
  <UContainer>
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
        Start a workout to begin tracking your exercises and sets.
      </p>
      <UButton
        label="Start Workout"
        icon="i-lucide-play"
        size="lg"
        @click="showStartModal = true"
      />
    </div>

    <!-- Active session -->
    <div v-else>
      <!-- Teleport actions into mobile header bar -->
      <Teleport to="#mobile-header-actions">
        <UButton
          label="Finish"
          icon="i-lucide-check-circle"
          color="success"
          size="xs"
          @click="showCompleteModal = true"
        />
        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>
      </Teleport>

      <!-- Desktop header -->
      <UPageHeader :title="session.name" class="hidden lg:block">
        <template #description>
          <div class="flex items-center gap-4 text-sm">
            <span class="flex items-center gap-1.5 text-muted">
              <UIcon name="i-lucide-clock" class="size-4" />
              <SessionsSessionTimer :started-at="session.startedAt" />
            </span>
            <span class="flex items-center gap-1.5 text-muted">
              <UIcon name="i-lucide-dumbbell" class="size-4" />
              {{ totalSets }} sets
            </span>
            <span class="flex items-center gap-1.5 text-muted">
              <UIcon name="i-lucide-weight" class="size-4" />
              {{ formattedVolume }}
            </span>
          </div>
        </template>
        <template #links>
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

      <!-- Mobile stats bar -->
      <div class="lg:hidden flex items-center justify-between py-3 mb-3 border-b border-default text-sm">
        <div class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-clock" class="size-4" />
          <SessionsSessionTimer :started-at="session.startedAt" />
        </div>
        <div class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-dumbbell" class="size-4" />
          <span>{{ totalSets }} sets</span>
        </div>
        <div class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-weight" class="size-4" />
          <span>{{ formattedVolume }}</span>
        </div>
      </div>

      <!-- Session Notes -->
      <div v-if="showSessionNotes" class="mb-4">
        <UTextarea
          v-model="sessionNotesText"
          placeholder="Session notes..."
          :rows="2"
          size="sm"
          @blur="scheduleSessionNoteSave()"
        />
      </div>

      <!-- Exercise list -->
      <div
        v-if="session.sessionExercises.length > 0"
        class="space-y-3 sm:space-y-4"
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

      <!-- Add Exercise button (below exercises, like Hevy) -->
      <UButton
        label="Add Exercise"
        icon="i-lucide-plus"
        variant="outline"
        class="w-full mt-4 justify-center"
        @click="showExercisePicker = true"
      />

      <!-- Empty exercise state (only when no exercises at all) -->
      <div
        v-if="session.sessionExercises.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-plus-circle" class="size-10 text-muted mb-3" />
        <p class="text-sm text-muted">
          Add your first exercise to get started
        </p>
      </div>

      <!-- Bottom spacer so content scrolls past the rest timer overlay -->
      <div
        v-if="restTimer.isRunning.value || restTimer.isCompleted.value"
        class="h-28"
      />
    </div>

    <!-- Modals -->
    <SessionsSessionStartModal
      v-model="showStartModal"
      @started="onSessionStarted"
    />
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
