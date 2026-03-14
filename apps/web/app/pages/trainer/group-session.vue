<script setup lang="ts">
import type { ExerciseHistorySession } from '@workout/shared'

definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const trainerStore = useTrainerStore()
const groupSession = useGroupSession()

const { restTimerEnabled, defaultRestSec, fetch: fetchSettings } = useUserSettings()

// ── Parse athlete IDs from query ──

const athleteIds = computed(() => {
  const raw = route.query.athletes as string | undefined
  if (!raw) return []
  return raw.split(',').filter(Boolean)
})

if (athleteIds.value.length === 0 || athleteIds.value.length > 3) {
  navigateTo('/trainer/athletes')
}

// ── Modal state ──

const exercisePickerFor = ref<string | null>(null) // athleteId
const historyPanel = ref<{
  athleteId: string
  exerciseId: string
  athleteName: string
  exerciseName: string
  history: ExerciseHistorySession[]
  loading: boolean
} | null>(null)
const completeFor = ref<string | null>(null) // athleteId
const abandonFor = ref<string | null>(null) // athleteId
const completeRpe = ref<number | undefined>(undefined)
const completeNotes = ref('')

// ── Start all sessions modal state ──
const showStartModal = ref(false)
const startSessionName = ref('')
const startingSession = ref(false)
const selectedAssignments = ref(new Map<string, string>()) // athleteId → assignmentId

// ── Initialization ──

onMounted(async () => {
  // Fetch athlete profiles and settings in parallel
  const [profiles] = await Promise.all([
    Promise.all(
      athleteIds.value.map((id) => trainerStore.fetchAthleteProfile(id)),
    ),
    fetchSettings(),
  ])

  const athletes = profiles.map((p, i) => ({
    id: athleteIds.value[i]!,
    name: p ? `${p.firstName} ${p.lastName}` : `Athlete ${i + 1}`,
  }))

  await groupSession.initSlots(athletes)

  // Auto-show start modal if any athletes don't have active sessions
  if (groupSession.needsStart.value) {
    showStartModal.value = true
  }
})

// ── Watch for all done ──

watch(
  () => groupSession.allDone.value,
  (done) => {
    if (done && !groupSession.initializing.value) {
      toast.add({ title: 'All sessions completed', color: 'success' })
      navigateTo('/trainer/athletes')
    }
  },
)

// ── Event handlers ──

function onSetCompletedEvent(
  athleteId: string,
  data: { setRestSec: number | null; exerciseRestSec: number | null },
) {
  if (!restTimerEnabled.value) return

  const slot = groupSession.getSlot(athleteId)
  if (!slot) return

  // Resolution: session-sticky override → set rest → exercise prescription → user default
  const seconds =
    slot.restTimer.sessionDefault.value ??
    data.setRestSec ??
    data.exerciseRestSec ??
    defaultRestSec.value

  if (seconds > 0) {
    slot.restTimer.start(seconds)
  }
}

async function onUpdateSet(
  athleteId: string,
  exerciseId: string,
  setId: string,
  data: Record<string, unknown>,
) {
  try {
    await groupSession.updateSet(athleteId, exerciseId, setId, data)
  } catch {
    toast.add({ title: 'Failed to save set', color: 'error' })
  }
}

async function onToggleSetCompleted(
  athleteId: string,
  exerciseId: string,
  setId: string,
) {
  const slot = groupSession.getSlot(athleteId)
  if (!slot?.session) return

  const exercise = slot.session.sessionExercises.find(
    (e) => e.id === exerciseId,
  )
  const set = exercise?.sets.find((s) => s.id === setId)
  if (!set) return

  try {
    await groupSession.updateSet(athleteId, exerciseId, setId, {
      completed: !set.completed,
    })
  } catch {
    toast.add({ title: 'Failed to update set', color: 'error' })
  }
}

async function onAddSet(athleteId: string, exerciseId: string) {
  try {
    await groupSession.addSet(athleteId, exerciseId, {})
  } catch {
    toast.add({ title: 'Failed to add set', color: 'error' })
  }
}

async function onDeleteSet(
  athleteId: string,
  exerciseId: string,
  setId: string,
) {
  try {
    await groupSession.deleteSet(athleteId, exerciseId, setId)
  } catch {
    toast.add({ title: 'Failed to delete set', color: 'error' })
  }
}

async function onUpdateExercise(
  athleteId: string,
  exerciseId: string,
  data: Record<string, unknown>,
) {
  try {
    await groupSession.updateExercise(athleteId, exerciseId, data as any)
  } catch {
    toast.add({ title: 'Failed to update exercise', color: 'error' })
  }
}

async function onAddExercise(athleteId: string, exerciseId: string) {
  try {
    await groupSession.addExercise(athleteId, { exerciseId })
  } catch {
    toast.add({ title: 'Failed to add exercise', color: 'error' })
  }
}

async function onAddExerciseAndClose(exerciseId: string) {
  if (!exercisePickerFor.value) return
  const athleteId = exercisePickerFor.value
  exercisePickerFor.value = null
  try {
    await groupSession.addExercise(athleteId, { exerciseId })
    toast.add({ title: 'Exercise added', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to add exercise', color: 'error' })
  }
}

async function onRemoveExercise(athleteId: string, exerciseId: string) {
  try {
    await groupSession.removeExercise(athleteId, exerciseId)
    toast.add({ title: 'Exercise removed', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to remove exercise', color: 'error' })
  }
}

async function onShowHistory(athleteId: string, exerciseId: string) {
  const slot = groupSession.getSlot(athleteId)
  if (!slot) return

  const exercise = slot.session?.sessionExercises.find(
    (e) => e.exerciseId === exerciseId,
  )

  historyPanel.value = {
    athleteId,
    exerciseId,
    athleteName: slot.athleteName,
    exerciseName: exercise?.exercise.name ?? 'Exercise',
    history: slot.exerciseHistory.get(exerciseId) ?? [],
    loading: slot.historyLoading.has(exerciseId),
  }

  // Fetch if not cached
  if (!slot.exerciseHistory.has(exerciseId)) {
    await groupSession.fetchExerciseHistory(athleteId, exerciseId)
    // Update the panel after fetch
    if (historyPanel.value?.exerciseId === exerciseId) {
      historyPanel.value.history =
        slot.exerciseHistory.get(exerciseId) ?? []
      historyPanel.value.loading = false
    }
  }
}

// ── Complete / Abandon ──

async function confirmComplete() {
  if (!completeFor.value) return
  try {
    await groupSession.completeSession(completeFor.value, {
      overallRpe: completeRpe.value,
      notes: completeNotes.value.trim() || undefined,
    })
    toast.add({ title: 'Workout completed!', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to complete workout', color: 'error' })
  } finally {
    completeFor.value = null
    completeRpe.value = undefined
    completeNotes.value = ''
  }
}

async function confirmAbandon() {
  if (!abandonFor.value) return
  try {
    await groupSession.abandonSession(abandonFor.value)
    toast.add({ title: 'Workout abandoned', color: 'neutral' })
  } catch {
    toast.add({ title: 'Failed to abandon workout', color: 'error' })
  } finally {
    abandonFor.value = null
  }
}

async function endAllComplete() {
  const slotsToComplete = [...groupSession.slots.value]
  let failures = 0
  for (const slot of slotsToComplete) {
    if (slot.session) {
      try {
        await groupSession.completeSession(slot.athleteId, {})
      } catch {
        failures++
      }
    }
  }
  if (failures === 0) {
    toast.add({ title: 'All workouts completed', color: 'success' })
  } else {
    toast.add({ title: `${failures} workout(s) failed to complete`, color: 'error' })
  }
}

async function endAllAbandon() {
  const slotsToAbandon = [...groupSession.slots.value]
  let failures = 0
  for (const slot of slotsToAbandon) {
    if (slot.session) {
      try {
        await groupSession.abandonSession(slot.athleteId)
      } catch {
        failures++
      }
    }
  }
  if (failures === 0) {
    toast.add({ title: 'All workouts abandoned', color: 'neutral' })
  } else {
    toast.add({ title: `${failures} workout(s) failed to abandon`, color: 'error' })
  }
}

// ── Start Session for athlete without active session ──

async function confirmStartAllSessions() {
  startingSession.value = true
  try {
    await groupSession.startAllSessions(
      { name: startSessionName.value.trim() || undefined },
      selectedAssignments.value.size > 0 ? selectedAssignments.value : undefined,
    )
    showStartModal.value = false
    toast.add({ title: 'Sessions started', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to start sessions', color: 'error' })
  } finally {
    startingSession.value = false
    startSessionName.value = ''
    selectedAssignments.value = new Map()
  }
}

// ── Computed ──

const earliestStartedAt = computed(() => {
  const dates = groupSession.slots.value
    .filter((s) => s.session)
    .map((s) => s.session!.startedAt)
  if (dates.length === 0) return null
  return dates.sort()[0] ?? null
})

// Exercise picker helpers
const exercisePickerSlot = computed(() => {
  if (!exercisePickerFor.value) return null
  return groupSession.getSlot(exercisePickerFor.value) ?? null
})

const exercisePickerExistingIds = computed(() => {
  if (!exercisePickerSlot.value?.session) return new Set<string>()
  return new Set(
    exercisePickerSlot.value.session.sessionExercises.map(
      (e) => e.exerciseId,
    ),
  )
})

// ── Route leave guard ──

onBeforeRouteLeave((_to, _from, next) => {
  const hasActiveSessions = groupSession.slots.value.some((s) => s.session)
  if (hasActiveSessions) {
    const confirmed = window.confirm(
      'You have active sessions. Are you sure you want to leave?',
    )
    next(confirmed)
  } else {
    next()
  }
})
</script>

<template>
  <UContainer class="py-4">
    <!-- Loading -->
    <div v-if="groupSession.initializing.value" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <template v-else>
      <!-- Header -->
      <TrainerGroupSessionHeader
        :slot-count="groupSession.slots.value.length"
        :earliest-started-at="earliestStartedAt"
        @end-all-complete="endAllComplete"
        @end-all-abandon="endAllAbandon"
      />

      <!-- Cards Grid -->
      <TrainerGroupSessionCardsView>
        <TrainerGroupSessionAthleteSessionCard
          v-for="slot in groupSession.slots.value"
          :key="slot.athleteId"
          :slot="slot"
          :current-exercise="groupSession.currentExercise(slot.athleteId)"
          :exercise-index="slot.currentExerciseIndex"
          :exercise-count="groupSession.exerciseCount(slot.athleteId)"
          @add-set="onAddSet(slot.athleteId, $event)"
          @update-set="(...args: [string, string, Record<string, unknown>]) => onUpdateSet(slot.athleteId, ...args)"
          @toggle-set-completed="(...args: [string, string]) => onToggleSetCompleted(slot.athleteId, ...args)"
          @delete-set="(...args: [string, string]) => onDeleteSet(slot.athleteId, ...args)"
          @add-exercise="exercisePickerFor = slot.athleteId"
          @update-exercise="(...args: [string, Record<string, unknown>]) => onUpdateExercise(slot.athleteId, ...args)"
          @remove-exercise="onRemoveExercise(slot.athleteId, $event)"
          @next-exercise="groupSession.nextExercise(slot.athleteId)"
          @prev-exercise="groupSession.prevExercise(slot.athleteId)"
          @complete="completeFor = slot.athleteId"
          @abandon="abandonFor = slot.athleteId"
          @show-history="onShowHistory(slot.athleteId, $event)"
          @set-completed-event="onSetCompletedEvent(slot.athleteId, $event)"
        />

      </TrainerGroupSessionCardsView>
    </template>

    <!-- Exercise Picker Modal -->
    <TrainerGroupSessionGroupExercisePicker
      v-if="exercisePickerFor && exercisePickerSlot"
      :open="true"
      :athlete-name="exercisePickerSlot.athleteName"
      :existing-exercise-ids="exercisePickerExistingIds"
      @add="onAddExerciseAndClose($event)"
      @update:open="(v: boolean) => { if (!v) exercisePickerFor = null }"
    />

    <!-- Exercise History Panel -->
    <TrainerGroupSessionExerciseHistoryPanel
      v-if="historyPanel"
      :open="true"
      :athlete-name="historyPanel.athleteName"
      :exercise-name="historyPanel.exerciseName"
      :history="historyPanel.history"
      :loading="historyPanel.loading"
      @update:open="(v: boolean) => { if (!v) historyPanel = null }"
    />

    <!-- Complete Modal -->
    <UModal
      :open="!!completeFor"
      title="Complete Workout"
      @update:open="(v: boolean) => { if (!v) completeFor = null }"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Complete workout for
            <strong>{{ groupSession.getSlot(completeFor!)?.athleteName }}</strong>?
          </p>

          <UFormField label="Overall RPE" hint="1-10">
            <UInput
              v-model.number="completeRpe"
              type="number"
              placeholder="How hard was this workout?"
              :min="1"
              :max="10"
              :step="0.5"
            />
          </UFormField>

          <UFormField label="Notes">
            <UTextarea
              v-model="completeNotes"
              placeholder="Any notes about this session..."
              :rows="2"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="completeFor = null"
          />
          <UButton
            label="Complete"
            icon="i-lucide-check-circle"
            color="success"
            @click="confirmComplete"
          />
        </div>
      </template>
    </UModal>

    <!-- Abandon Modal -->
    <UModal
      :open="!!abandonFor"
      title="Abandon Workout?"
      @update:open="(v: boolean) => { if (!v) abandonFor = null }"
    >
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to abandon the workout for
          <strong>{{ groupSession.getSlot(abandonFor!)?.athleteName }}</strong>?
          Logged sets will be saved but the session will be marked as abandoned.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="abandonFor = null"
          />
          <UButton
            label="Abandon"
            icon="i-lucide-x-circle"
            color="error"
            @click="confirmAbandon"
          />
        </div>
      </template>
    </UModal>

    <!-- Start Group Session Modal -->
    <UModal
      :open="showStartModal"
      title="Start Group Session"
      @update:open="(v: boolean) => { if (!v) showStartModal = false }"
    >
      <template #body>
        <div class="space-y-4">
          <div
            v-for="slot in groupSession.slots.value.filter(s => !s.session)"
            :key="slot.athleteId"
            class="space-y-1"
          >
            <p class="text-sm font-medium">{{ slot.athleteName }}</p>
            <select
              v-if="slot.assignments.length > 0"
              :value="selectedAssignments.get(slot.athleteId) ?? ''"
              class="w-full rounded-md bg-default ring ring-accented text-highlighted px-2.5 py-1.5 text-sm focus:outline-primary"
              @change="(e: Event) => {
                const v = (e.target as HTMLSelectElement).value
                if (v) selectedAssignments.set(slot.athleteId, v)
                else selectedAssignments.delete(slot.athleteId)
              }"
            >
              <option value="">Freestyle (no program)</option>
              <option
                v-for="a in slot.assignments"
                :key="a.id"
                :value="a.id"
              >
                {{ a.program.name }}
              </option>
            </select>
            <p v-else class="text-xs text-muted">Freestyle (no programs assigned)</p>
          </div>

          <UFormField label="Session Name (optional)">
            <UInput
              v-model="startSessionName"
              placeholder="e.g. Upper Body Day"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="showStartModal = false"
          />
          <UButton
            label="Start"
            icon="i-lucide-play"
            :loading="startingSession"
            @click="confirmStartAllSessions"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
