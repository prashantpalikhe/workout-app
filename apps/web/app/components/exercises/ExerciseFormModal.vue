<script setup lang="ts">
import { z } from 'zod'
import { createExerciseInputSchema } from '@workout/shared'
import {
  EXERCISE_TRACKING_TYPES,
  EXERCISE_EQUIPMENT,
  EXERCISE_MOVEMENT_PATTERNS,
} from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'
import type { Exercise } from '~/stores/exercises'

const props = defineProps<{
  exercise: Exercise | null
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>({ default: false })

const exerciseStore = useExerciseStore()
const { formatEnum } = useFormatEnum()

const isEditMode = computed(() => !!props.exercise)

// Wrap schema to convert empty strings to undefined before validation
const formSchema = z.preprocess(
  (val) => {
    if (typeof val === 'object' && val !== null) {
      const obj = { ...val as Record<string, unknown> }
      for (const key of Object.keys(obj)) {
        if (obj[key] === '') obj[key] = undefined
      }
      return obj
    }
    return val
  },
  createExerciseInputSchema,
)

const state = reactive({
  name: '',
  trackingType: '' as string,
  equipment: '' as string,
  movementPattern: '' as string,
  instructions: '',
})

const error = ref('')
const submitting = ref(false)

watch(
  () => props.exercise,
  (ex) => {
    if (ex) {
      state.name = ex.name
      state.trackingType = ex.trackingType
      state.equipment = ex.equipment || ''
      state.movementPattern = ex.movementPattern || ''
      state.instructions = ex.instructions || ''
    } else {
      state.name = ''
      state.trackingType = ''
      state.equipment = ''
      state.movementPattern = ''
      state.instructions = ''
    }
    error.value = ''
  },
)

const trackingTypeItems = EXERCISE_TRACKING_TYPES.map(t => ({
  label: formatEnum(t),
  value: t,
}))

const equipmentItems = EXERCISE_EQUIPMENT.map(e => ({
  label: formatEnum(e),
  value: e,
}))

const movementItems = EXERCISE_MOVEMENT_PATTERNS.map(m => ({
  label: formatEnum(m),
  value: m,
}))

type FormData = {
  name: string
  trackingType: string
  equipment?: string
  movementPattern?: string
  instructions?: string
}

async function onSubmit(event: FormSubmitEvent<FormData>) {
  error.value = ''
  submitting.value = true

  const payload = {
    ...event.data,
    equipment: event.data.equipment || undefined,
    movementPattern: event.data.movementPattern || undefined,
    instructions: event.data.instructions || undefined,
  }

  try {
    if (isEditMode.value && props.exercise) {
      await exerciseStore.updateExercise(props.exercise.id, payload)
    } else {
      await exerciseStore.createExercise(payload as any)
    }
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
    :title="isEditMode ? 'Edit Exercise' : 'Create Exercise'"
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
        <UFormField label="Name" name="name" class="mb-4">
          <UInput
            v-model="state.name"
            placeholder="e.g. Incline Dumbbell Press"
            autofocus
          />
        </UFormField>

        <UFormField label="Tracking Type" name="trackingType" class="mb-4">
          <USelect
            v-model="state.trackingType"
            :items="trackingTypeItems"
            placeholder="Select tracking type"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <UFormField label="Equipment" name="equipment">
            <USelect
              v-model="state.equipment"
              :items="equipmentItems"
              placeholder="Select equipment"
            />
          </UFormField>

          <UFormField label="Movement Pattern" name="movementPattern">
            <USelect
              v-model="state.movementPattern"
              :items="movementItems"
              placeholder="Select pattern"
            />
          </UFormField>
        </div>

        <UFormField label="Instructions" name="instructions" class="mb-6">
          <UTextarea
            v-model="state.instructions"
            placeholder="Describe how to perform this exercise..."
            :rows="3"
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
            :label="isEditMode ? 'Save Changes' : 'Create Exercise'"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
