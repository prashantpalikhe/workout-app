<script setup lang="ts">
import { SESSION_SET_TYPES } from '@workout/shared'
import type { SessionSet } from '~/stores/sessions'

const props = defineProps<{
  sessionId: string
  exerciseId: string
  set: SessionSet
  setIndex: number
  trackingType: string
}>()

const emit = defineEmits<{
  'set-completed': [{ setId: string; restSec: number | null }]
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
  (v) => { noteText.value = v ?? '' },
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
    await sessionStore.updateSet(
      props.sessionId,
      props.exerciseId,
      props.set.id,
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

// Local form state initialized from prop
const form = reactive({
  setType: props.set.setType,
  weight: props.set.weight ?? (undefined as number | undefined),
  reps: props.set.reps ?? (undefined as number | undefined),
  durationSec: props.set.durationSec ?? (undefined as number | undefined),
  distance: props.set.distance ?? (undefined as number | undefined),
  rpe: props.set.rpe ?? (undefined as number | undefined)
})

// Sync from prop when set data changes externally
watch(
  () => props.set,
  (s) => {
    form.setType = s.setType
    form.weight = s.weight ?? undefined
    form.reps = s.reps ?? undefined
    form.durationSec = s.durationSec ?? undefined
    form.distance = s.distance ?? undefined
    form.rpe = s.rpe ?? undefined
  },
  { deep: true }
)

// Auto-save on blur
const { saving, error, schedule, cancel } = useAutoSave(
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
        completed: !wasCompleted,
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

// Set type options for USelect
const setTypeItems = SESSION_SET_TYPES.map((t) => ({
  label: formatEnum(t),
  value: t
}))

// Set number dropdown — set type only (desktop), set type + view note (mobile)
const setTypeDropdownItems = computed(() => {
  const typeItems = SESSION_SET_TYPES.map((t) => ({
    label: formatEnum(t),
    icon: form.setType === t ? 'i-lucide-check' : undefined,
    onSelect: () => {
      form.setType = t
      schedule()
    },
  }))

  return [typeItems]
})

const mobileSetTypeDropdownItems = computed(() => {
  const typeItems = SESSION_SET_TYPES.map((t) => ({
    label: formatEnum(t),
    icon: form.setType === t ? 'i-lucide-check' : undefined,
    onSelect: () => {
      form.setType = t
      schedule()
    },
  }))

  if (hasNote.value) {
    return [
      typeItems,
      [{
        label: 'View Note',
        icon: 'i-lucide-message-square',
        onSelect: () => openNoteDialog(),
      }],
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
      onSelect: () => openNoteDialog(),
    },
    {
      label: 'Delete Set',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => deleteSet(),
    },
  ],
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
        class="absolute inset-0 flex items-center justify-end px-4 bg-error/15 text-error transition-opacity"
        :class="swipeAction === 'delete' ? 'opacity-100' : 'opacity-0'"
      >
        <UIcon name="i-lucide-trash-2" class="size-5" />
      </div>
      <!-- Note background (swipe right) -->
      <div
        class="absolute inset-0 flex items-center justify-start px-4 bg-info/15 text-info transition-opacity"
        :class="swipeAction === 'note' ? 'opacity-100' : 'opacity-0'"
      >
        <UIcon name="i-lucide-message-square" class="size-5" />
      </div>

      <!-- Swipeable row -->
      <div
        ref="rowRef"
        class="relative flex items-center gap-1 px-1 py-0.5 bg-default transition-transform"
        :class="set.completed ? 'bg-success/10' : 'hover:bg-elevated/50'"
        :style="isSwiping ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : { transform: 'translateX(0)' }"
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Set number (tap for set type + view note on mobile) -->
        <UDropdownMenu :items="mobileSetTypeDropdownItems" :content="{ align: 'start' as const }">
          <button
            class="text-xs font-semibold shrink-0 w-6 py-0.5 text-center rounded transition-colors"
            :class="hasNote ? 'bg-info/15 text-info hover:bg-info/25' : 'bg-elevated/60 hover:bg-elevated text-muted hover:text-default'"
          >
            {{ setIndex + 1 }}
          </button>
        </UDropdownMenu>

        <!-- Data inputs -->
        <UInput
          v-if="showWeight"
          v-model.number="form.weight"
          type="number"
          placeholder="kg"
          size="xs"
          :step="0.5"
          :min="0"
          class="flex-1 min-w-0"
          :ui="{ base: 'text-center' }"
          @blur="schedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-if="showReps"
          v-model.number="form.reps"
          type="number"
          placeholder="Reps"
          size="xs"
          :min="0"
          class="flex-1 min-w-0"
          :ui="{ base: 'text-center' }"
          @blur="schedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-if="showDuration"
          v-model.number="form.durationSec"
          type="number"
          placeholder="Sec"
          size="xs"
          :min="0"
          class="flex-1 min-w-0"
          :ui="{ base: 'text-center' }"
          @blur="schedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-if="showDistance"
          v-model.number="form.distance"
          type="number"
          placeholder="km"
          size="xs"
          :step="0.1"
          :min="0"
          class="flex-1 min-w-0"
          :ui="{ base: 'text-center' }"
          @blur="schedule()"
          @keyup.enter="onInputEnter"
        />
        <UInput
          v-model.number="form.rpe"
          type="number"
          placeholder="RPE"
          size="xs"
          :min="1"
          :max="10"
          :step="0.5"
          class="w-12 sm:w-14 shrink-0"
          :ui="{ base: 'text-center' }"
          @blur="schedule()"
          @keyup.enter="onInputEnter"
        />

        <!-- Complete button -->
        <button
          class="flex items-center justify-center size-7 shrink-0 rounded-md transition-colors"
          :class="set.completed
            ? 'text-success bg-success/10'
            : 'text-muted hover:text-default hover:bg-elevated'"
          :aria-label="set.completed ? 'Mark incomplete' : 'Mark complete'"
          @click="toggleCompleted"
        >
          <UIcon
            :name="set.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
            class="size-5"
          />
        </button>
      </div>
    </div>

    <!-- Desktop row (no swipe) -->
    <div
      class="hidden md:flex items-center gap-1.5 px-1.5 py-0.5 transition-colors"
      :class="set.completed ? 'bg-success/10' : 'hover:bg-elevated/50'"
    >
      <!-- Set number (tap for set type) -->
      <UDropdownMenu :items="setTypeDropdownItems" :content="{ align: 'start' as const }">
        <button
          class="text-xs font-semibold shrink-0 w-6 py-0.5 text-center rounded transition-colors"
          :class="hasNote ? 'bg-info/15 text-info hover:bg-info/25' : 'bg-elevated/60 hover:bg-elevated text-muted hover:text-default'"
        >
          {{ setIndex + 1 }}
        </button>
      </UDropdownMenu>

      <!-- Set type -->
      <USelect
        v-model="form.setType"
        :items="setTypeItems"
        size="xs"
        class="w-24 shrink-0"
        @update:model-value="schedule()"
      />

      <!-- Data inputs -->
      <UInput
        v-if="showWeight"
        v-model.number="form.weight"
        type="number"
        placeholder="kg"
        size="xs"
        :step="0.5"
        :min="0"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center' }"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showReps"
        v-model.number="form.reps"
        type="number"
        placeholder="Reps"
        size="xs"
        :min="0"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center' }"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showDuration"
        v-model.number="form.durationSec"
        type="number"
        placeholder="Sec"
        size="xs"
        :min="0"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center' }"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-if="showDistance"
        v-model.number="form.distance"
        type="number"
        placeholder="km"
        size="xs"
        :step="0.1"
        :min="0"
        class="flex-1 min-w-0"
        :ui="{ base: 'text-center' }"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />
      <UInput
        v-model.number="form.rpe"
        type="number"
        placeholder="RPE"
        size="xs"
        :min="1"
        :max="10"
        :step="0.5"
        class="w-14 shrink-0"
        :ui="{ base: 'text-center' }"
        @blur="schedule()"
        @keyup.enter="onInputEnter"
      />

      <!-- Complete button -->
      <button
        class="flex items-center justify-center size-8 shrink-0 rounded-md transition-colors"
        :class="set.completed
          ? 'text-success bg-success/10'
          : 'text-muted hover:text-default hover:bg-elevated'"
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
          size="2xs"
        />
      </UDropdownMenu>
    </div>

    <!-- Note dialog -->
    <UModal v-model:open="noteDialogOpen" :title="hasNote ? 'Set Note' : 'Add Note'">
      <template #body>
        <UTextarea
          v-model="noteText"
          placeholder="Write a note for this set..."
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
  </div>
</template>
