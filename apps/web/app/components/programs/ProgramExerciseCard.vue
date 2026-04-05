<script setup lang="ts">
import type { ProgramExercise } from '~/stores/programs'

const props = defineProps<{
  exercise: ProgramExercise
  readonly?: boolean
}>()

defineEmits<{
  remove: []
}>()

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

// Expand/collapse
const expanded = ref(false)

// Notes expand/collapse (within the expanded card)
const showNotes = ref(!!props.exercise.notes)

function onInputEnter(event: Event) {
  (event.target as HTMLInputElement).blur()
}

// One-line summary of the targets
const summary = computed(() => {
  const parts: string[] = []
  if (form.targetSets && form.targetReps) {
    parts.push(`${form.targetSets} × ${form.targetReps}`)
  } else if (form.targetSets) {
    parts.push(`${form.targetSets} sets`)
  } else if (form.targetReps) {
    parts.push(`${form.targetReps} reps`)
  }
  if (form.targetRpe) parts.push(`RPE ${form.targetRpe}`)
  if (form.targetTempo) parts.push(`tempo ${form.targetTempo}`)
  if (form.restSec) parts.push(`${form.restSec}s rest`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="border border-default rounded-lg flex gap-3 items-start group">
    <!-- Drag handle -->
    <div
      v-if="!readonly"
      class="drag-handle cursor-grab active:cursor-grabbing pl-3 pt-4 text-muted opacity-50 group-hover:opacity-100 transition-opacity touch-none"
    >
      <UIcon name="i-lucide-grip-vertical" class="size-5" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0 p-3" :class="{ 'pl-0': !readonly }">
      <!-- Header row: name + badge + summary (when collapsed) + toggle -->
      <button
        type="button"
        class="w-full flex items-center justify-between gap-2 text-left"
        @click="expanded = !expanded"
      >
        <div class="min-w-0 flex-1">
          <div class="min-w-0">
            <span class="font-medium truncate block">{{ exercise.exercise.name }}</span>
          </div>
          <p v-if="!expanded && summary" class="text-xs text-muted truncate mt-0.5">
            {{ summary }}
          </p>
          <p v-else-if="!expanded && !readonly" class="text-xs text-muted/70 mt-0.5">
            Tap to set targets
          </p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span v-if="saving" class="text-xs text-muted animate-pulse">Saving...</span>
          <UIcon v-if="error" name="i-lucide-alert-circle" class="size-4 text-error" />
          <UIcon
            :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="size-4 text-muted"
          />
        </div>
      </button>

      <!-- Expanded: inline input fields + notes + remove -->
      <div v-if="expanded" class="mt-3">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-2">
          <UFormField label="Sets">
            <UInput
              v-model.number="form.targetSets"
              type="number"
              placeholder="3"
                            :min="1"
              :disabled="readonly"
              @blur="schedule()"
              @keyup.enter="onInputEnter"
            />
          </UFormField>

          <UFormField label="Reps">
            <UInput
              v-model="form.targetReps"
              placeholder="8-12"
                            :disabled="readonly"
              @blur="schedule()"
              @keyup.enter="onInputEnter"
            />
          </UFormField>

          <UFormField label="RPE">
            <UInput
              v-model.number="form.targetRpe"
              type="number"
              placeholder="8"
                            :min="1"
              :max="10"
              :step="0.5"
              :disabled="readonly"
              @blur="schedule()"
              @keyup.enter="onInputEnter"
            />
          </UFormField>

          <UFormField label="Tempo">
            <UInput
              v-model="form.targetTempo"
              placeholder="2-1-1-0"
                            :disabled="readonly"
              @blur="schedule()"
              @keyup.enter="onInputEnter"
            />
          </UFormField>

          <UFormField label="Rest (s)">
            <UInput
              v-model.number="form.restSec"
              type="number"
              placeholder="90"
                            :min="0"
              :disabled="readonly"
              @blur="schedule()"
              @keyup.enter="onInputEnter"
            />
          </UFormField>
        </div>

        <!-- Notes: collapsible -->
        <div class="mb-2">
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
                        :disabled="readonly"
            class="w-full"
            @blur="schedule()"
          />
        </div>

        <!-- Remove -->
        <div v-if="!readonly" class="flex justify-end">
          <UButton
            label="Remove"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
                        @click="$emit('remove')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
