<script setup lang="ts">
import { SESSION_SET_TYPES } from '@workout/shared'
import type { SessionSet } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exerciseId: string
  realExerciseId: string
  set: SessionSet
  setIndex: number
  workingSetNumber: number
  trackingType: string
}>()

const emit = defineEmits<{
  'set-completed': [{ setId: string, restSec: number | null }]
}>()

const sessionStore = useSessionStore()
const toast = useToast()
const { formatEnum } = useFormatEnum()
const { parseWeightInput, formatWeightValue, weightUnit, unitPreference } = useUnits()

/**
 * Weight drift tolerance. Round-tripping through kg<->lbs has ~0.1 lb drift
 * because both conversions round to 2 decimals. Anything closer than this is
 * considered "the same value" so the prop-sync watcher doesn't flicker.
 */
const WEIGHT_EPSILON = 0.2

function kgToDisplay(kg: number | null | undefined): number | undefined {
  const v = formatWeightValue(kg)
  return v ?? undefined
}

function displayToKg(value: number | undefined): number | undefined {
  if (value == null) return undefined
  return parseWeightInput(value) ?? undefined
}

function weightsEqual(a: number | undefined, b: number | undefined): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  return Math.abs(a - b) < WEIGHT_EPSILON
}

// ── Delete confirmation ──
const showDeleteConfirm = ref(false)

function confirmDelete() {
  showDeleteConfirm.value = true
}

// ── Note dialog state ──
const noteDialogOpen = ref(false)
const noteText = ref(props.set.notes ?? '')
const noteSaving = ref(false)
const hasNote = computed(() => !!props.set.notes)

watch(
  () => props.set.notes,
  (v) => {
    noteText.value = v ?? ''
  }
)

function openNoteDialog() {
  noteText.value = props.set.notes ?? ''
  noteDialogOpen.value = true
}

async function saveNote() {
  noteSaving.value = true
  try {
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      { notes: noteText.value.trim() || undefined }
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
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      { notes: null }
    )
    noteText.value = ''
    noteDialogOpen.value = false
  } catch {
    toast.add({ title: 'Failed to delete note', color: 'error' })
  } finally {
    noteSaving.value = false
  }
}

// Local form state initialized from prop.
// NOTE: `weight` is held in the USER'S DISPLAY UNIT (kg or lbs), not kg.
// The metric source of truth stays in `props.set.weight` and the store; this
// form value is converted back to kg only at save time.
const form = reactive({
  setType: props.set.setType,
  weight: kgToDisplay(props.set.weight),
  reps: props.set.reps ?? (undefined as number | undefined),
  durationSec: props.set.durationSec ?? (undefined as number | undefined),
  distance: props.set.distance ?? (undefined as number | undefined),
  rpe: props.set.rpe ?? (undefined as number | undefined)
})

// Dirty tracking — prevents the watch from overwriting user edits
// with stale API responses from a previous auto-save.
const dirty = ref(false)
let editVersion = 0

function markDirtyAndSchedule() {
  dirty.value = true
  editVersion++
  schedule()
}

// Sync from prop when set data changes externally (e.g. after API response)
watch(
  () => props.set,
  (s) => {
    // Skip sync while the user has unsaved local edits — the auto-save
    // response for a previous save could otherwise overwrite newer input.
    if (dirty.value) return

    if (form.setType !== s.setType) form.setType = s.setType
    // `s.weight` is in kg; convert to display unit for comparison with `form.weight`.
    // Tolerant compare avoids round-trip drift flicker (225 → 102.06 kg → 224.9 lb).
    const newWeight = kgToDisplay(s.weight)
    const r = s.reps ?? undefined
    const d = s.durationSec ?? undefined
    const dist = s.distance ?? undefined
    const rpe = s.rpe ?? undefined
    if (!weightsEqual(form.weight, newWeight)) form.weight = newWeight
    if (form.reps !== r) form.reps = r
    if (form.durationSec !== d) form.durationSec = d
    if (form.distance !== dist) form.distance = dist
    if (form.rpe !== rpe) form.rpe = rpe
  },
  { deep: true }
)

// When the unit preference flips mid-session, re-derive the display value
// from the stored kg. Guard against overwriting an in-progress edit.
watch(unitPreference, () => {
  if (dirty.value) return
  form.weight = kgToDisplay(props.set.weight)
})

// Auto-save on blur
const {
  saving: _saving,
  error: _error,
  schedule,
  cancel
} = useAutoSave(
  async () => {
    const versionAtSaveStart = editVersion

    const payload: Record<string, unknown> = {}
    payload.setType = form.setType
    // Convert the display-unit weight back to kg before hitting the API.
    payload.weight = form.weight ? displayToKg(form.weight) : undefined
    payload.reps = form.reps || undefined
    payload.durationSec = form.durationSec || undefined
    payload.distance = form.distance || undefined
    payload.rpe = form.rpe || undefined
    // Always include completed so a delayed autosave doesn't overwrite a recent checkmark
    payload.completed = props.set.completed

    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      payload
    )

    // Only clear dirty if the user didn't edit again while the save was in-flight
    if (editVersion === versionAtSaveStart) {
      dirty.value = false
    }
  },
  {
    debounceMs: 400,
    onError: () => {
      toast.add({ title: 'Failed to save set', color: 'error' })
    }
  }
)

// ── PR check state (local, not persisted) ──
const prLabels = ref<string[]>([])

// Completed checkbox — immediate save (no debounce)
// Includes all current form data so a pending auto-save can't race with it
async function toggleCompleted() {
  const wasCompleted = props.set.completed
  // Cancel any pending debounced auto-save — we'll include all form data here
  cancel()
  try {
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
      {
        setType: form.setType,
        weight: form.weight ? displayToKg(form.weight) : undefined,
        reps: form.reps || undefined,
        durationSec: form.durationSec || undefined,
        distance: form.distance || undefined,
        rpe: form.rpe || undefined,
        completed: !wasCompleted
      }
    )
    // Clear dirty only after the save succeeds — the API response triggers
    // the watch, but the store update happens synchronously inside updateSet
    // before this line runs, so the watch was still guarded by dirty=true.
    dirty.value = false
    if (!wasCompleted) {
      // Emit only when marking a set as complete (not when uncompleting)
      emit('set-completed', { setId: props.set.id, restSec: props.set.restSec })
      checkForPR()
    } else {
      // Uncompleting — clear PR indicator
      prLabels.value = []
    }
  } catch {
    toast.add({ title: 'Failed to update set', color: 'error' })
  }
}

async function checkForPR() {
  try {
    const result = await sessionStore.checkPR(props.realExerciseId, {
      sessionId: props.sessionId,
      excludeSetId: props.set.id,
      weight: displayToKg(form.weight),
      reps: form.reps,
      durationSec: form.durationSec,
      distance: form.distance
    })
    if (result.isPR) {
      prLabels.value = result.prTypes.map(p => p.label)
      toast.add({
        title: `New PR: ${prLabels.value.join(', ')}`,
        icon: 'i-lucide-trophy',
        color: 'warning'
      })
    } else {
      prLabels.value = []
    }
  } catch {
    // PR check is non-critical — silently ignore failures
  }
}

async function deleteSet() {
  cancel()
  try {
    await sessionStore.deleteSet(
      props.sessionId,
      props.exerciseId,
      props.set.id
    )
  } catch {
    toast.add({ title: 'Failed to delete set', color: 'error' })
  }
}

// Set label — "W" for warm-up, sequential number (excluding warm-ups) for everything else
const setLabel = computed(() => {
  if (form.setType === 'WARM_UP') return 'W'
  return String(props.workingSetNumber)
})

// Set number dropdown — set type only (desktop), set type + view note (mobile)
const setTypeDropdownItems = computed(() => {
  const typeItems = SESSION_SET_TYPES.map(t => ({
    label: formatEnum(t),
    icon: form.setType === t ? 'i-lucide-check' : undefined,
    onSelect: () => {
      form.setType = t
      markDirtyAndSchedule()
    }
  }))

  return [typeItems]
})

const mobileSetTypeDropdownItems = computed(() => {
  const typeItems = SESSION_SET_TYPES.map(t => ({
    label: formatEnum(t),
    icon: form.setType === t ? 'i-lucide-check' : undefined,
    onSelect: () => {
      form.setType = t
      markDirtyAndSchedule()
    }
  }))

  const actionItems = [
    {
      label: hasNote.value ? 'View Note' : 'Add Note',
      icon: 'i-lucide-message-square',
      onSelect: () => openNoteDialog()
    },
    {
      label: 'Delete Set',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => confirmDelete()
    }
  ]

  return [typeItems, actionItems]
})

// Desktop three-dots menu — note + delete
const actionDropdownItems = computed(() => [
  [
    {
      label: hasNote.value ? 'View Note' : 'Add Note',
      icon: 'i-lucide-message-square',
      onSelect: () => openNoteDialog()
    },
    {
      label: 'Delete Set',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => confirmDelete()
    }
  ]
])

function onInputEnter(event: Event) {
  ;(event.target as HTMLInputElement).blur()
  if (!props.set.completed) {
    toggleCompleted()
  }
}

// Which data inputs to show
const showWeight = computed(() =>
  ['WEIGHT_REPS', 'WEIGHT_DURATION'].includes(props.trackingType)
)
const showReps = computed(() =>
  ['WEIGHT_REPS', 'REPS_ONLY'].includes(props.trackingType)
)
const showDuration = computed(() =>
  ['DURATION', 'WEIGHT_DURATION', 'DISTANCE_DURATION'].includes(
    props.trackingType
  )
)
const showDistance = computed(() => props.trackingType === 'DISTANCE_DURATION')
</script>

<template>
  <div>
    <!-- Mobile row -->
    <div class="md:hidden">
      <div
        class="flex items-center gap-1 px-1 py-1"
        :class="set.completed ? 'bg-success/10' : 'hover:bg-elevated/50'"
      >
        <!-- Set number (tap for set type + view note on mobile) -->
        <UDropdownMenu
          :items="mobileSetTypeDropdownItems"
          :content="{ align: 'start' as const }"
        >
          <button
            class="text-xs font-bold shrink-0 w-7 py-1 text-center rounded transition-colors text-muted"
          >
            {{ setLabel }}
          </button>
        </UDropdownMenu>

        <!-- Data inputs -->
        <UInput
          v-if="showWeight"
          v-model.number="form.weight"
          type="text"
          inputmode="decimal"
          :placeholder="weightUnit"
          class="flex-1 min-w-0"
          variant="none"
          :ui="{ base: 'text-center font-semibold !px-0' }"
          @blur="markDirtyAndSchedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-if="showReps"
          v-model.number="form.reps"
          type="text"
          inputmode="decimal"
          placeholder="Reps"

          class="flex-1 min-w-0"
          variant="none"
          :ui="{ base: 'text-center font-semibold !px-0' }"
          @blur="markDirtyAndSchedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-if="showDuration"
          v-model.number="form.durationSec"
          type="text"
          inputmode="decimal"
          placeholder="Sec"

          class="flex-1 min-w-0"
          variant="none"
          :ui="{ base: 'text-center font-semibold !px-0' }"
          @blur="markDirtyAndSchedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-if="showDistance"
          v-model.number="form.distance"
          type="text"
          inputmode="decimal"
          placeholder="km"
          class="flex-1 min-w-0"
          variant="none"
          :ui="{ base: 'text-center font-semibold !px-0' }"
          @blur="markDirtyAndSchedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-model.number="form.rpe"
          type="text"
          inputmode="decimal"
          placeholder="RPE"
          class="flex-1 min-w-0"
          variant="none"
          :ui="{ base: 'text-center font-semibold !px-0' }"
          @blur="markDirtyAndSchedule()"
          @keyup.enter="onInputEnter"
        />

        <!-- Complete button -->
        <button
          class="flex items-center justify-center size-7 shrink-0 rounded-md transition-colors"
          :class="
            prLabels.length > 0
              ? 'text-warning bg-warning/10'
              : set.completed
                ? 'text-success bg-success/10'
                : 'text-muted hover:text-default hover:bg-elevated'
          "
          :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
          @click="toggleCompleted"
        >
          <UIcon
            :name="
              prLabels.length > 0
                ? 'i-lucide-trophy'
                : set.completed
                  ? 'i-lucide-check-circle-2'
                  : 'i-lucide-circle'
            "
            class="size-5"
          />
        </button>
      </div>
    </div>

    <!-- Inline note (mobile) -->
    <button
      v-if="hasNote"
      class="md:hidden flex items-center gap-1 px-1 pl-9 pb-1 text-xs text-info hover:underline truncate"
      @click="openNoteDialog"
    >
      <UIcon name="i-lucide-message-square" class="size-3 shrink-0" />
      <span class="truncate">{{ set.notes }}</span>
    </button>

    <!-- Desktop row (no swipe) -->
    <div
      class="hidden md:flex items-center gap-1.5 px-1.5 py-1 transition-colors"
      :class="set.completed ? 'bg-success/10' : 'hover:bg-elevated/50'"
    >
      <!-- Set number (tap for set type) -->
      <UDropdownMenu
        :items="setTypeDropdownItems"
        :content="{ align: 'start' as const }"
      >
        <button
          class="text-xs font-bold shrink-0 w-7 py-1 text-center rounded transition-colors text-muted"
        >
          {{ setLabel }}
        </button>
      </UDropdownMenu>

      <!-- Data inputs -->
      <UInput
        v-if="showWeight"
        v-model.number="form.weight"
        type="text"
        inputmode="decimal"
        :placeholder="weightUnit"
        variant="none"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center font-semibold !px-0' }"
        @blur="markDirtyAndSchedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showReps"
        v-model.number="form.reps"
        type="text"
        inputmode="decimal"
        placeholder="Reps"
        variant="none"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center font-semibold !px-0' }"
        @blur="markDirtyAndSchedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showDuration"
        v-model.number="form.durationSec"
        type="text"
        inputmode="decimal"
        placeholder="Sec"
        variant="none"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center font-semibold !px-0' }"
        @blur="markDirtyAndSchedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showDistance"
        v-model.number="form.distance"
        type="text"
        inputmode="decimal"
        placeholder="km"
        variant="none"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center font-semibold !px-0' }"
        @blur="markDirtyAndSchedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-model.number="form.rpe"
        type="text"
        inputmode="decimal"
        placeholder="RPE"
        variant="none"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center font-semibold !px-0' }"
        @blur="markDirtyAndSchedule()"
        @keyup.enter="onInputEnter"
      />

      <!-- Complete button -->
      <button
        class="flex items-center justify-center size-8 shrink-0 rounded-md transition-colors"
        :class="
          prLabels.length > 0
            ? 'text-warning bg-warning/10'
            : set.completed
              ? 'text-success bg-success/10'
              : 'text-muted hover:text-default hover:bg-elevated'
        "
        :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
        @click="toggleCompleted"
      >
        <UIcon
          :name="
            prLabels.length > 0
              ? 'i-lucide-trophy'
              : set.completed
                ? 'i-lucide-check-circle-2'
                : 'i-lucide-circle'
          "
          class="size-5"
        />
      </button>

      <!-- Desktop actions dropdown -->
      <UDropdownMenu :items="actionDropdownItems">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
        />
      </UDropdownMenu>
    </div>

    <!-- Inline note (desktop) -->
    <button
      v-if="hasNote"
      class="hidden md:flex items-center gap-1 px-1.5 pl-10 pb-1 text-xs text-info hover:underline truncate"
      @click="openNoteDialog"
    >
      <UIcon name="i-lucide-message-square" class="size-3 shrink-0" />
      <span class="truncate">{{ set.notes }}</span>
    </button>

    <!-- Note dialog -->
    <UModal
      v-model:open="noteDialogOpen"
      :title="hasNote ? 'Set Note' : 'Add Note'"
    >
      <template #body>
        <UTextarea
          v-model="noteText"
          placeholder="Write a note for this set..."
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
            icon="i-lucide-trash-2"
            :loading="noteSaving"
            @click="deleteNote"
          />
          <div class="flex gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="noteDialogOpen = false"
            />
            <UButton label="Save" :loading="noteSaving" @click="saveNote" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteConfirm" title="Delete Set?">
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to delete set {{ setLabel }}? This can't be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="showDeleteConfirm = false"
          />
          <UButton
            label="Delete"
            color="error"
            @click="showDeleteConfirm = false; deleteSet()"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
