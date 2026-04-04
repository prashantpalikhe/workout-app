<script setup lang="ts">
import type { SessionExercise } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exercise: SessionExercise
  canEditProgram?: boolean
}>()

const emit = defineEmits<{
  substitute: []
  remove: []
  'set-completed': [{ setRestSec: number | null, exerciseRestSec: number | null }]
}>()

const sessionStore = useSessionStore()
const toast = useToast()

const addingSet = ref(false)
const showHistory = ref(false)
const showProgramEdit = ref(false)

const trackingType = computed(() => props.exercise.exercise.trackingType)

// ── Note dialog state ──
const noteDialogOpen = ref(false)
const noteText = ref(props.exercise.notes ?? '')
const noteSaving = ref(false)
const hasNote = computed(() => !!props.exercise.notes)

watch(
  () => props.exercise.notes,
  (v) => { noteText.value = v ?? '' },
)

function openNoteDialog() {
  noteText.value = props.exercise.notes ?? ''
  noteDialogOpen.value = true
}

async function saveNote() {
  noteSaving.value = true
  try {
    await sessionStore.updateExercise(
      props.sessionId,
      props.exercise.id,
      { notes: noteText.value.trim() || undefined },
    )
    noteDialogOpen.value = false
  } catch {
    toast.add({ title: 'Failed to save note', color: 'error' })
  } finally {
    noteSaving.value = false
  }
}

async function deleteNote() {
  noteSaving.value = true
  try {
    await sessionStore.updateExercise(
      props.sessionId,
      props.exercise.id,
      { notes: undefined },
    )
    noteText.value = ''
    noteDialogOpen.value = false
  } catch {
    toast.add({ title: 'Failed to delete note', color: 'error' })
  } finally {
    noteSaving.value = false
  }
}

async function addSet() {
  addingSet.value = true
  try {
    // Prefill from the last set's values
    const lastSet = props.exercise.sets[props.exercise.sets.length - 1]
    await sessionStore.addSet(props.sessionId, props.exercise.id, {
      setNumber: props.exercise.sets.length + 1,
      setType: lastSet?.setType ?? 'WORKING',
      weight: lastSet?.weight ?? undefined,
      reps: lastSet?.reps ?? undefined,
      durationSec: lastSet?.durationSec ?? undefined,
      distance: lastSet?.distance ?? undefined,
      rpe: lastSet?.rpe ?? undefined,
      completed: false,
    })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({ title: fetchError?.data?.message || 'Failed to add set', color: 'error' })
  } finally {
    addingSet.value = false
  }
}

function onSetCompleted(data: { setId: string, restSec: number | null }) {
  emit('set-completed', {
    setRestSec: data.restSec,
    exerciseRestSec: props.exercise.prescribedExercise?.restSec ?? null
  })
}

// Column headers based on tracking type
const showWeight = computed(() =>
  ['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(trackingType.value)
)
const showReps = computed(() =>
  ['WEIGHT_REPS', 'REPS_ONLY'].includes(trackingType.value)
)
const showDuration = computed(() =>
  ['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(trackingType.value)
)
const showDistance = computed(() => trackingType.value === 'DISTANCE_DURATION')

const dropdownItems = computed(() => {
  const items = [
    {
      label: 'History',
      icon: 'i-lucide-history',
      onSelect: () => { showHistory.value = true },
    },
    {
      label: hasNote.value ? 'View Note' : 'Add Note',
      icon: 'i-lucide-message-square',
      onSelect: () => openNoteDialog(),
    },
  ]

  if (props.canEditProgram && props.exercise.prescribedExercise) {
    items.push({
      label: 'Update in Program',
      icon: 'i-lucide-pencil',
      onSelect: () => { showProgramEdit.value = true },
    })
  }

  items.push(
    {
      label: 'Substitute Exercise',
      icon: 'i-lucide-repeat-2',
      onSelect: () => emit('substitute'),
    },
    {
      label: 'Remove Exercise',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => emit('remove'),
    },
  )

  return [items]
})
</script>

<template>
  <UCard :ui="{ body: 'p-3 sm:p-4' }">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <button
          class="text-sm font-medium truncate sm:text-base text-left hover:underline"
          @click="showHistory = true"
        >
          {{ exercise.exercise.name }}
        </button>
        <UBadge
          v-if="exercise.isSubstitution"
          color="warning"
          variant="subtle"
          size="xs"
        >
          Substituted
        </UBadge>
        <UIcon
          v-if="hasNote"
          name="i-lucide-message-square"
          class="size-3.5 text-info shrink-0 cursor-pointer"
          @click="openNoteDialog"
        />
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Prescribed info -->
    <div v-if="exercise.prescribedExercise" class="flex items-center gap-3 text-xs text-muted mb-2">
      <span v-if="exercise.prescribedExercise.targetReps" class="flex items-center gap-1">
        <UIcon name="i-lucide-repeat" class="size-3" />
        {{ exercise.prescribedExercise.targetReps }} reps
      </span>
      <span v-if="exercise.prescribedExercise.targetRpe" class="flex items-center gap-1">
        RPE {{ exercise.prescribedExercise.targetRpe }}
      </span>
      <span v-if="exercise.prescribedExercise.targetTempo" class="flex items-center gap-1">
        <UIcon name="i-lucide-timer" class="size-3" />
        {{ exercise.prescribedExercise.targetTempo }}
      </span>
      <span v-if="exercise.prescribedExercise.restSec" class="flex items-center gap-1">
        <UIcon name="i-lucide-pause" class="size-3" />
        {{ exercise.prescribedExercise.restSec }}s rest
      </span>
    </div>

    <!-- Column headers -->
    <div v-if="exercise.sets.length" class="flex items-center gap-1 sm:gap-1.5 px-1 pb-1 text-[10px] uppercase tracking-wider text-muted font-medium border-b border-default/50 mb-0.5">
      <span class="w-6 shrink-0 text-center">Set</span>
      <span class="hidden md:block w-24 shrink-0">Type</span>
      <span v-if="showWeight" class="flex-1 min-w-0 text-center">kg</span>
      <span v-if="showReps" class="flex-1 min-w-0 text-center">Reps</span>
      <span v-if="showDuration" class="flex-1 min-w-0 text-center">Sec</span>
      <span v-if="showDistance" class="flex-1 min-w-0 text-center">km</span>
      <span class="w-12 sm:w-14 shrink-0 text-center">RPE</span>
      <span class="w-7 sm:w-8 shrink-0" />
    </div>

    <!-- Set rows -->
    <div>
      <SessionsSessionSetRow
        v-for="(set, index) in exercise.sets"
        :key="set.id"
        :session-id="sessionId"
        :exercise-id="exercise.id"
        :set="set"
        :set-index="index"
        :tracking-type="trackingType"
        @set-completed="onSetCompleted"
      />
    </div>

    <!-- Add set button -->
    <UButton
      label="Add Set"
      icon="i-lucide-plus"
      variant="ghost"
      size="xs"
      class="mt-1.5 w-full"
      :loading="addingSet"
      @click="addSet"
    />

    <!-- Program exercise edit modal -->
    <SessionsProgramExerciseEditModal
      v-if="canEditProgram && exercise.prescribedExercise"
      v-model:open="showProgramEdit"
      :program-id="exercise.prescribedExercise.programId"
      :prescribed-exercise-id="exercise.prescribedExercise.id"
      :exercise-name="exercise.exercise.name"
      :initial-values="exercise.prescribedExercise"
    />

    <!-- Exercise history slideover -->
    <SessionsExerciseHistorySlideover
      v-model:open="showHistory"
      :exercise-id="exercise.exerciseId"
      :exercise-name="exercise.exercise.name"
    />

    <!-- Exercise note dialog -->
    <UModal v-model:open="noteDialogOpen" :title="hasNote ? 'Exercise Note' : 'Add Exercise Note'">
      <template #body>
        <UTextarea
          v-model="noteText"
          placeholder="Write a note for this exercise..."
          :rows="3"
          autofocus
        />
      </template>
      <template #footer>
        <div class="flex items-center" :class="hasNote ? 'justify-between' : 'justify-end'">
          <UButton
            v-if="hasNote"
            label="Delete Note"
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash-2"
            :loading="noteSaving"
            @click="deleteNote"
          />
          <div class="flex gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" size="sm" @click="noteDialogOpen = false" />
            <UButton label="Save" size="sm" :loading="noteSaving" @click="saveNote" />
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
