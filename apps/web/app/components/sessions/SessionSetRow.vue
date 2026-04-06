<script setup lang="ts">
import { SESSION_SET_TYPES } from '@workout/shared'
import type { SessionSet } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exerciseId: string
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

// ── Swipe state ──
const rowRef = ref<HTMLElement | null>(null)
const swipeOffset = ref(0)
const isSwiping = ref(false)
const swipeAction = ref<'none' | 'delete' | 'note'>('none')
let touchStartX = 0
let touchStartY = 0
let isHorizontalSwipe: boolean | null = null
const SWIPE_THRESHOLD = 80

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  isHorizontalSwipe = null
  isSwiping.value = false
}

function onTouchMove(e: TouchEvent) {
  const dx = e.touches[0].clientX - touchStartX
  const dy = e.touches[0].clientY - touchStartY

  // Determine swipe direction on first significant move
  if (isHorizontalSwipe === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    isHorizontalSwipe = Math.abs(dx) > Math.abs(dy)
  }

  if (!isHorizontalSwipe) return

  e.preventDefault()
  isSwiping.value = true
  // Clamp offset with resistance
  const maxSwipe = 120
  const clamped = Math.max(-maxSwipe, Math.min(maxSwipe, dx))
  swipeOffset.value = clamped

  if (clamped <= -SWIPE_THRESHOLD) {
    swipeAction.value = 'delete'
  } else if (clamped >= SWIPE_THRESHOLD) {
    swipeAction.value = 'note'
  } else {
    swipeAction.value = 'none'
  }
}

function onTouchEnd() {
  if (swipeAction.value === 'delete') {
    deleteSet()
  } else if (swipeAction.value === 'note') {
    openNoteDialog()
  }
  swipeOffset.value = 0
  isSwiping.value = false
  swipeAction.value = 'none'
  isHorizontalSwipe = null
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

// Local form state initialized from prop
const form = reactive({
  setType: props.set.setType,
  weight: props.set.weight ?? (undefined as number | undefined),
  reps: props.set.reps ?? (undefined as number | undefined),
  durationSec: props.set.durationSec ?? (undefined as number | undefined),
  distance: props.set.distance ?? (undefined as number | undefined),
  rpe: props.set.rpe ?? (undefined as number | undefined)
})

// Sync from prop when set data changes externally (e.g. after API response)
watch(
  () => props.set,
  (s) => {
    // Only overwrite local form if the server value actually differs,
    // to avoid resetting user edits during debounced auto-save
    if (form.setType !== s.setType) form.setType = s.setType
    const w = s.weight ?? undefined
    const r = s.reps ?? undefined
    const d = s.durationSec ?? undefined
    const dist = s.distance ?? undefined
    const rpe = s.rpe ?? undefined
    if (form.weight !== w) form.weight = w
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
    const payload: Record<string, unknown> = {}
    payload.setType = form.setType
    payload.weight = form.weight || undefined
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
  },
  {
    debounceMs: 400,
    onError: () => {
      toast.add({ title: 'Failed to save set', color: 'error' })
    }
  }
)

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
        weight: form.weight || undefined,
        reps: form.reps || undefined,
        durationSec: form.durationSec || undefined,
        distance: form.distance || undefined,
        rpe: form.rpe || undefined,
        completed: !wasCompleted
      }
    )
    // Emit only when marking a set as complete (not when uncompleting)
    if (!wasCompleted) {
      emit('set-completed', { setId: props.set.id, restSec: props.set.restSec })
    }
  } catch {
    toast.add({ title: 'Failed to update set', color: 'error' })
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
      schedule()
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
      schedule()
    }
  }))

  if (hasNote.value) {
    return [
      typeItems,
      [
        {
          label: 'View Note',
          icon: 'i-lucide-message-square',
          onSelect: () => openNoteDialog()
        }
      ]
    ]
  }

  return [typeItems]
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
      onSelect: () => deleteSet()
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
    <!-- Swipe background layers (mobile only) -->
    <div class="relative md:hidden overflow-hidden">
      <!-- Delete background (swipe left) -->
      <div
        v-show="swipeOffset < 0"
        class="absolute inset-y-0 right-0 w-24 flex items-center justify-center text-error rounded-r-md"
        :class="swipeAction === 'delete' ? 'bg-error/25' : 'bg-error/10'"
      >
        <UIcon name="i-lucide-trash-2" class="size-5" />
      </div>
      <!-- Note background (swipe right) -->
      <div
        v-show="swipeOffset > 0"
        class="absolute inset-y-0 left-0 w-24 flex items-center justify-center text-info rounded-l-md"
        :class="swipeAction === 'note' ? 'bg-info/25' : 'bg-info/10'"
      >
        <UIcon name="i-lucide-message-square" class="size-5" />
      </div>

      <!-- Swipeable row -->
      <div
        ref="rowRef"
        class="relative flex items-center gap-1 px-1 py-1 transition-transform"
        :class="set.completed ? 'bg-success/10' : 'hover:bg-elevated/50'"
        :style="
          isSwiping
            ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
            : { transform: 'translateX(0)' }
        "
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
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
          placeholder="kg"
          class="flex-1 min-w-0"
          variant="none"
          :ui="{ base: 'text-center font-semibold !px-0' }"
          @blur="schedule()"
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
          @blur="schedule()"
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
          @blur="schedule()"
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
          @blur="schedule()"
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
          @blur="schedule()"
          @keyup.enter="onInputEnter"
        />

        <!-- Complete button -->
        <button
          class="flex items-center justify-center size-7 shrink-0 rounded-md transition-colors"
          :class="
            set.completed
              ? 'text-success bg-success/10'
              : 'text-muted hover:text-default hover:bg-elevated'
          "
          :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
          @click="toggleCompleted"
        >
          <UIcon
            :name="
              set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'
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
        placeholder="kg"
        variant="none"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center font-semibold !px-0' }"
        @blur="schedule()"
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
        @blur="schedule()"
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
        @blur="schedule()"
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
        @blur="schedule()"
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
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />

      <!-- Complete button -->
      <button
        class="flex items-center justify-center size-8 shrink-0 rounded-md transition-colors"
        :class="
          set.completed
            ? 'text-success bg-success/10'
            : 'text-muted hover:text-default hover:bg-elevated'
        "
        :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
        @click="toggleCompleted"
      >
        <UIcon
          :name="set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
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
  </div>
</template>
