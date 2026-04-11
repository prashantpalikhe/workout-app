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
const { parseWeightInput, formatWeightValue, weightUnit } = useUnits()

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
// `weightKg` is the metric source of truth — the display conversion happens
// in the `weightDisplay` computed below, so the stored kg only changes when
// the user actively types a new value. An unconverted pass-through on save
// would silently drift the stored value (e.g. 80 kg → 176.4 lb → 80.01 kg).
const form = reactive({
  setType: props.set.setType,
  weightKg: props.set.weight ?? (undefined as number | undefined),
  reps: props.set.reps ?? (undefined as number | undefined),
  durationSec: props.set.durationSec ?? (undefined as number | undefined),
  distance: props.set.distance ?? (undefined as number | undefined),
  rpe: props.set.rpe ?? (undefined as number | undefined)
})

/**
 * Bi-directional display binding for the weight input. The getter rounds kg
 * to the display unit for rendering; the setter is only invoked when the
 * user types, so the underlying kg value stays untouched otherwise.
 */
const weightDisplay = computed<number | undefined>({
  get: () => formatWeightValue(form.weightKg ?? null) ?? undefined,
  set: (value) => {
    if (value == null || Number.isNaN(value)) {
      form.weightKg = undefined
      return
    }
    form.weightKg = parseWeightInput(value) ?? undefined
  }
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
    // Both sides are kg — exact equality is safe.
    const wKg = s.weight ?? undefined
    const r = s.reps ?? undefined
    const d = s.durationSec ?? undefined
    const dist = s.distance ?? undefined
    const rpe = s.rpe ?? undefined
    if (form.weightKg !== wKg) form.weightKg = wKg
    if (form.reps !== r) form.reps = r
    if (form.durationSec !== d) form.durationSec = d
    if (form.distance !== dist) form.distance = dist
    if (form.rpe !== rpe) form.rpe = rpe
  },
  { deep: true }
)

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
    payload.weight = form.weightKg || undefined
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
        weight: form.weightKg || undefined,
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
      weight: form.weightKg,
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
          v-model.number="weightDisplay"
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
        v-model.number="weightDisplay"
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
