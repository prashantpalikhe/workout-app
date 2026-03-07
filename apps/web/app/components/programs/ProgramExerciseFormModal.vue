<script setup lang="ts">
import { z } from 'zod'
import { updateProgramExerciseInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'
import type { ProgramExercise } from '~/stores/programs'

const props = defineProps<{
  exercise: ProgramExercise | null
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>({ default: false })

const programStore = useProgramStore()

const formSchema = z.preprocess(
  (val) => {
    if (typeof val === 'object' && val !== null) {
      const obj = { ...val as Record<string, unknown> }
      for (const key of Object.keys(obj)) {
        if (obj[key] === '') obj[key] = undefined
      }
      // Coerce number fields from string inputs
      if (obj.targetSets) obj.targetSets = Number(obj.targetSets)
      if (obj.targetRpe) obj.targetRpe = Number(obj.targetRpe)
      if (obj.restSec) obj.restSec = Number(obj.restSec)
      return obj
    }
    return val
  },
  updateProgramExerciseInputSchema,
)

const state = reactive({
  targetSets: '' as string | number,
  targetReps: '',
  targetRpe: '' as string | number,
  targetTempo: '',
  restSec: '' as string | number,
  notes: '',
})

const error = ref('')
const submitting = ref(false)

watch(
  () => props.exercise,
  (ex) => {
    if (ex) {
      state.targetSets = ex.targetSets ?? ''
      state.targetReps = ex.targetReps ?? ''
      state.targetRpe = ex.targetRpe ?? ''
      state.targetTempo = ex.targetTempo ?? ''
      state.restSec = ex.restSec ?? ''
      state.notes = ex.notes ?? ''
    } else {
      state.targetSets = ''
      state.targetReps = ''
      state.targetRpe = ''
      state.targetTempo = ''
      state.restSec = ''
      state.notes = ''
    }
    error.value = ''
  },
)

type FormData = {
  targetSets?: number
  targetReps?: string
  targetRpe?: number
  targetTempo?: string
  restSec?: number
  notes?: string
}

async function onSubmit(event: FormSubmitEvent<FormData>) {
  if (!props.exercise) return
  error.value = ''
  submitting.value = true

  try {
    await programStore.updateExercise(
      props.exercise.programId,
      props.exercise.id,
      event.data,
    )
    emit('success')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Something went wrong'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="exercise ? `Edit Targets — ${exercise.exercise.name}` : 'Edit Targets'"
  >
    <template #body>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
        class="mb-4"
      />

      <UForm
        :schema="formSchema"
        :state="state"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-2 gap-4 mb-4">
          <UFormField label="Target Sets" name="targetSets">
            <UInput
              v-model="state.targetSets"
              type="number"
              placeholder="e.g. 3"
            />
          </UFormField>

          <UFormField label="Target Reps" name="targetReps">
            <UInput
              v-model="state.targetReps"
              placeholder="e.g. 8-12"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <UFormField label="Target RPE" name="targetRpe">
            <UInput
              v-model="state.targetRpe"
              type="number"
              placeholder="e.g. 8"
              min="1"
              max="10"
              step="0.5"
            />
          </UFormField>

          <UFormField label="Rest (seconds)" name="restSec">
            <UInput
              v-model="state.restSec"
              type="number"
              placeholder="e.g. 90"
            />
          </UFormField>
        </div>

        <UFormField label="Target Tempo" name="targetTempo" class="mb-4">
          <UInput
            v-model="state.targetTempo"
            placeholder="e.g. 3-1-2-0"
          />
        </UFormField>

        <UFormField label="Notes" name="notes" class="mb-6">
          <UTextarea
            v-model="state.notes"
            placeholder="Optional notes..."
            :rows="2"
          />
        </UFormField>

        <div class="flex justify-end gap-3">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save Targets"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
