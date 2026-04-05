<script setup lang="ts">
import type { ProgramExercise } from '~/stores/programs'

const props = defineProps<{
  exercise: ProgramExercise
  readonly?: boolean
}>()

defineEmits<{
  remove: []
}>()

const { formatEnum } = useFormatEnum()
const programStore = useProgramStore()
const toast = useToast()

// Local reactive form state, initialized from prop
const form = reactive({
  targetSets: props.exercise.targetSets ?? undefined as number | undefined,
  targetReps: props.exercise.targetReps ?? '',
  targetRpe: props.exercise.targetRpe ?? undefined as number | undefined,
  targetTempo: props.exercise.targetTempo ?? '',
  restSec: props.exercise.restSec ?? undefined as number | undefined,
  notes: props.exercise.notes ?? ''
})

// Sync from prop when exercise data changes externally (e.g., after reorder API response)
watch(() => props.exercise, (ex) => {
  form.targetSets = ex.targetSets ?? undefined
  form.targetReps = ex.targetReps ?? ''
  form.targetRpe = ex.targetRpe ?? undefined
  form.targetTempo = ex.targetTempo ?? ''
  form.restSec = ex.restSec ?? undefined
  form.notes = ex.notes ?? ''
}, { deep: true })

// Auto-save on blur
const { saving, error, schedule } = useAutoSave(
  async () => {
    const payload: Record<string, unknown> = {}
    payload.targetSets = form.targetSets || undefined
    payload.targetReps = form.targetReps || undefined
    payload.targetRpe = form.targetRpe || undefined
    payload.targetTempo = form.targetTempo || undefined
    payload.restSec = form.restSec || undefined
    payload.notes = form.notes || undefined

    await programStore.updateExercise(
      props.exercise.programId,
      props.exercise.id,
      payload
    )
  },
  {
    debounceMs: 400,
    onError: () => {
      toast.add({ title: 'Failed to save exercise changes', color: 'error' })
    }
  }
)

// Notes expand/collapse
const showNotes = ref(!!props.exercise.notes)

function onInputEnter(event: Event) {
  (event.target as HTMLInputElement).blur()
}
</script>

<template>
  <div class="border border-default rounded-lg p-4 flex gap-3 items-start group">
    <!-- Drag handle -->
    <div
      v-if="!readonly"
      class="drag-handle cursor-grab active:cursor-grabbing pt-1 text-muted opacity-50 group-hover:opacity-100 transition-opacity touch-none"
    >
      <UIcon name="i-lucide-grip-vertical" class="size-5" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Header: name + badge + status + remove -->
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-medium truncate">{{ exercise.exercise.name }}</span>
          <UBadge
            v-if="exercise.exercise.equipment"
            variant="subtle"
            size="xs"
          >
            {{ formatEnum(exercise.exercise.equipment) }}
          </UBadge>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span v-if="saving" class="text-xs text-muted animate-pulse">Saving...</span>
          <UIcon v-if="error" name="i-lucide-alert-circle" class="size-4 text-error" />
          <UButton
            v-if="!readonly"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            aria-label="Remove exercise"
            @click="$emit('remove')"
          />
        </div>
      </div>

      <!-- Inline input fields -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
        <UFormField label="Sets" size="xs">
          <UInput
            v-model.number="form.targetSets"
            type="number"
            placeholder="3"
            size="xs"
            :min="1"
            :disabled="readonly"
            @blur="schedule()"
            @keyup.enter="onInputEnter"
          />
        </UFormField>

        <UFormField label="Reps" size="xs">
          <UInput
            v-model="form.targetReps"
            placeholder="8-12"
            size="xs"
            :disabled="readonly"
            @blur="schedule()"
            @keyup.enter="onInputEnter"
          />
        </UFormField>

        <UFormField label="RPE" size="xs">
          <UInput
            v-model.number="form.targetRpe"
            type="number"
            placeholder="8"
            size="xs"
            :min="1"
            :max="10"
            :step="0.5"
            :disabled="readonly"
            @blur="schedule()"
            @keyup.enter="onInputEnter"
          />
        </UFormField>

        <UFormField label="Tempo" size="xs">
          <UInput
            v-model="form.targetTempo"
            placeholder="2-1-1-0"
            size="xs"
            :disabled="readonly"
            @blur="schedule()"
            @keyup.enter="onInputEnter"
          />
        </UFormField>

        <UFormField label="Rest (s)" size="xs">
          <UInput
            v-model.number="form.restSec"
            type="number"
            placeholder="90"
            size="xs"
            :min="0"
            :disabled="readonly"
            @blur="schedule()"
            @keyup.enter="onInputEnter"
          />
        </UFormField>
      </div>

      <!-- Notes: collapsible -->
      <div>
        <button
          v-if="!showNotes && !readonly"
          class="text-xs text-muted hover:text-default transition-colors"
          @click="showNotes = true"
        >
          + Add notes
        </button>
        <UTextarea
          v-if="showNotes"
          v-model="form.notes"
          placeholder="Notes..."
          :rows="2"
          size="xs"
          :disabled="readonly"
          @blur="schedule()"
        />
      </div>
    </div>
  </div>
</template>
