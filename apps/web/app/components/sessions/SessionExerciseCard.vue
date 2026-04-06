<script setup lang="ts">
import type { SessionExercise } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exercise: SessionExercise
  canEditProgram?: boolean
}>()

const emit = defineEmits<{
  'substitute': []
  'remove': []
  'set-completed': [
    { setRestSec: number | null, exerciseRestSec: number | null }
  ]
}>()

const sessionStore = useSessionStore()
const toast = useToast()

const addingSet = ref(false)
const showProgramEdit = ref(false)

const trackingType = computed(() => props.exercise.exercise.trackingType)

// ── Note dialog state ──
const noteDialogOpen = ref(false)
const noteText = ref(props.exercise.notes ?? '')
const noteSaving = ref(false)
const hasNote = computed(() => !!props.exercise.notes)

watch(
  () => props.exercise.notes,
  (v) => {
    noteText.value = v ?? ''
  }
)

function openNoteDialog() {
  noteText.value = props.exercise.notes ?? ''
  noteDialogOpen.value = true
}

async function saveNote() {
  noteSaving.value = true
  try {
    await sessionStore.updateExercise(props.sessionId, props.exercise.id, {
      notes: noteText.value.trim() || undefined
    })
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
    await sessionStore.updateExercise(props.sessionId, props.exercise.id, {
      notes: null
    })
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
      completed: false
    })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to add set',
      color: 'error'
    })
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

// Working set numbers (excludes warmups from counting)
const workingSetNumbers = computed(() => {
  let count = 0
  return props.exercise.sets.map((s) => {
    if (s.setType === 'WARM_UP') return 0
    count++
    return count
  })
})

// Column headers based on tracking type
const showWeight = computed(() =>
  ['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(trackingType.value)
)
const showReps = computed(() =>
  ['WEIGHT_REPS', 'REPS_ONLY'].includes(trackingType.value)
)
const showDuration = computed(() =>
  ['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(
    trackingType.value
  )
)
const showDistance = computed(() => trackingType.value === 'DISTANCE_DURATION')

const dropdownItems = computed(() => {
  const items = [
    {
      label: 'Exercise Details',
      icon: 'i-lucide-info',
      to: `/exercises/${props.exercise.exerciseId}`
    },
    {
      label: hasNote.value ? 'View Note' : 'Add Note',
      icon: 'i-lucide-message-square',
      onSelect: () => openNoteDialog()
    }
  ]

  if (props.canEditProgram && props.exercise.prescribedExercise) {
    items.push({
      label: 'Update in Program',
      icon: 'i-lucide-pencil',
      onSelect: () => {
        showProgramEdit.value = true
      }
    })
  }

  items.push(
    {
      label: 'Substitute Exercise',
      icon: 'i-lucide-repeat-2',
      onSelect: () => emit('substitute')
    },
    {
      label: 'Remove Exercise',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => emit('remove')
    }
  )

  return [items]
})
</script>

<template>
  <div class="py-3 sm:py-4 px-3 sm:px-4 bg-elevated/50 rounded-lg">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="flex items-center gap-2 min-w-0">
        <img
          v-if="exercise.exercise.imageUrls?.[0]"
          :src="exercise.exercise.imageUrls[0]"
          :alt="exercise.exercise.name"
          class="size-8 sm:size-9 rounded-full object-cover shrink-0 bg-elevated"
        >
        <div
          v-else
          class="size-8 sm:size-9 rounded-full bg-elevated flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-dumbbell" class="size-4 text-muted" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <NuxtLink
              :to="`/exercises/${exercise.exerciseId}`"
              class="text-sm font-semibold truncate sm:text-base text-left text-primary hover:underline"
            >
              {{ exercise.exercise.name }}
            </NuxtLink>
            <UBadge
              v-if="exercise.isSubstitution"
              color="warning"
              variant="subtle"
              size="xs"
            >
              Sub
            </UBadge>
          </div>
        </div>
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

    <!-- Inline note / "Add notes here..." -->
    <button
      class="text-xs my-4 block"
      :class="
        hasNote
          ? 'text-muted hover:text-default'
          : 'text-muted/50 hover:text-muted'
      "
      @click="openNoteDialog"
    >
      {{ exercise.notes || 'Add notes here...' }}
    </button>

    <!-- Prescribed rest timer info (inline, like Hevy) -->
    <div
      v-if="exercise.prescribedExercise?.restSec"
      class="flex items-center gap-1.5 text-xs text-primary mb-2"
    >
      <UIcon name="i-lucide-timer" class="size-3.5" />
      <span>Rest Timer:
        {{ Math.floor(exercise.prescribedExercise.restSec / 60) }}min
        {{ exercise.prescribedExercise.restSec % 60 }}s</span>
    </div>

    <!-- Column headers (mirror set row layout: mobile gap-1 px-1 | desktop gap-1.5 px-1.5) -->
    <div
      v-if="exercise.sets.length"
      class="flex md:hidden items-center gap-1 px-1 pb-1.5 text-[10px] uppercase tracking-wider text-muted font-medium mb-0.5"
    >
      <span class="w-7 shrink-0 text-center">Set</span>
      <span v-if="showWeight" class="flex-1 min-w-0 text-center">kg</span>
      <span v-if="showReps" class="flex-1 min-w-0 text-center">Reps</span>
      <span v-if="showDuration" class="flex-1 min-w-0 text-center">Sec</span>
      <span v-if="showDistance" class="flex-1 min-w-0 text-center">km</span>
      <span class="flex-1 min-w-0 text-center">RPE</span>
      <!-- checkmark -->
      <span class="w-7 shrink-0" />
    </div>
    <div
      v-if="exercise.sets.length"
      class="hidden md:flex items-center gap-1.5 px-1.5 pb-1.5 text-[10px] uppercase tracking-wider text-muted font-medium mb-0.5"
    >
      <span class="w-7 shrink-0 text-center">Set</span>
      <span v-if="showWeight" class="flex-1 min-w-0 text-center">kg</span>
      <span v-if="showReps" class="flex-1 min-w-0 text-center">Reps</span>
      <span v-if="showDuration" class="flex-1 min-w-0 text-center">Sec</span>
      <span v-if="showDistance" class="flex-1 min-w-0 text-center">km</span>
      <span class="flex-1 min-w-0 text-center">RPE</span>
      <!-- checkmark + actions dropdown -->
      <span class="w-8 shrink-0" />
      <span class="w-8 shrink-0" />
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
        :working-set-number="workingSetNumbers[index]"
        :tracking-type="trackingType"
        @set-completed="onSetCompleted"
      />
    </div>

    <!-- Add set button -->
    <UButton
      label="Add Set"
      icon="i-lucide-plus"
      variant="soft"
      color="neutral"
      size="sm"
      class="mt-2 w-full justify-center"
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

    <!-- Exercise note dialog -->
    <UModal
      v-model:open="noteDialogOpen"
      :title="hasNote ? 'Exercise Note' : 'Add Exercise Note'"
    >
      <template #body>
        <UTextarea
          v-model="noteText"
          placeholder="Write a note for this exercise..."
          :rows="3"
          autofocus
        />
      </template>
      <template #footer>
        <div
          class="flex items-center"
          :class="hasNote ? 'justify-between' : 'justify-end'"
        >
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
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              size="sm"
              @click="noteDialogOpen = false"
            />
            <UButton
              label="Save"
              size="sm"
              :loading="noteSaving"
              @click="saveNote"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
