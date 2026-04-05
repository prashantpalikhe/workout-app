<script setup lang="ts">
const props = defineProps<{
  programId: string
  prescribedExerciseId: string
  exerciseName: string
  initialValues: {
    targetSets: number | null
    targetReps: string | null
    targetRpe: number | null
    targetTempo: string | null
    restSec: number | null
    notes: string | null
  }
}>()

const open = defineModel<boolean>('open', { default: false })

const { api } = useApiClient()
const toast = useToast()

const saving = ref(false)

const form = reactive({
  targetSets: undefined as number | undefined,
  targetReps: '' as string,
  targetRpe: undefined as number | undefined,
  targetTempo: '' as string,
  restSec: undefined as number | undefined,
  notes: '' as string
})

// Sync form when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    form.targetSets = props.initialValues.targetSets ?? undefined
    form.targetReps = props.initialValues.targetReps ?? ''
    form.targetRpe = props.initialValues.targetRpe ?? undefined
    form.targetTempo = props.initialValues.targetTempo ?? ''
    form.restSec = props.initialValues.restSec ?? undefined
    form.notes = props.initialValues.notes ?? ''
  }
})

async function save() {
  saving.value = true
  try {
    await api(
      `/programs/${props.programId}/exercises/${props.prescribedExerciseId}`,
      {
        method: 'PATCH',
        body: {
          targetSets: form.targetSets || undefined,
          targetReps: form.targetReps.trim() || undefined,
          targetRpe: form.targetRpe || undefined,
          targetTempo: form.targetTempo.trim() || undefined,
          restSec: form.restSec || undefined,
          notes: form.notes.trim() || undefined
        }
      }
    )
    toast.add({ title: 'Program exercise updated', color: 'success' })
    open.value = false
  } catch {
    toast.add({ title: 'Failed to update program exercise', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="`Update ${exerciseName} in Program`">
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Target Sets">
            <UInput
              v-model.number="form.targetSets"
              type="number"
              placeholder="e.g. 4"
              :min="1"
            />
          </UFormField>
          <UFormField label="Target Reps">
            <UInput
              v-model="form.targetReps"
              placeholder="e.g. 8-12"
            />
          </UFormField>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Target RPE">
            <UInput
              v-model.number="form.targetRpe"
              type="number"
              placeholder="e.g. 8"
              :min="1"
              :max="10"
              :step="0.5"
            />
          </UFormField>
          <UFormField label="Rest (sec)">
            <UInput
              v-model.number="form.restSec"
              type="number"
              placeholder="e.g. 120"
              :min="0"
            />
          </UFormField>
        </div>
        <UFormField label="Tempo">
          <UInput
            v-model="form.targetTempo"
            placeholder="e.g. 3-1-2-0"
          />
        </UFormField>
        <UFormField label="Notes">
          <UTextarea
            v-model="form.notes"
            placeholder="Notes for this exercise..."
            :rows="2"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" color="neutral" variant="outline" size="sm" @click="open = false" />
        <UButton label="Save Changes" size="sm" :loading="saving" @click="save" />
      </div>
    </template>
  </UModal>
</template>
