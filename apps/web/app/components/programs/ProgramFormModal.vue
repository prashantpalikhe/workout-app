<script setup lang="ts">
import { z } from 'zod'
import { createProgramInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'
import type { Program } from '~/stores/programs'

const props = defineProps<{
  program: Program | null
}>()

const emit = defineEmits<{
  success: [program?: Program]
}>()

const open = defineModel<boolean>({ default: false })

const programStore = useProgramStore()

const isEditMode = computed(() => !!props.program)

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
  createProgramInputSchema
)

const state = reactive({
  name: '',
  description: '',
  folderId: '' as string
})

const error = ref('')
const submitting = ref(false)

watch(
  () => props.program,
  (p) => {
    if (p) {
      state.name = p.name
      state.description = p.description || ''
      state.folderId = p.folderId || ''
    } else {
      state.name = ''
      state.description = ''
      state.folderId = ''
    }
    error.value = ''
  }
)

const folderItems = computed(() =>
  programStore.folders.map(f => ({ label: f.name, value: f.id }))
)

type FormData = {
  name: string
  description?: string
  folderId?: string
}

async function onSubmit(event: FormSubmitEvent<FormData>) {
  error.value = ''
  submitting.value = true

  const payload = {
    ...event.data,
    description: event.data.description || undefined,
    folderId: event.data.folderId || undefined
  }

  try {
    if (isEditMode.value && props.program) {
      await programStore.updateProgram(props.program.id, payload)
      emit('success')
    } else {
      const created = await programStore.createProgram(payload as Parameters<typeof programStore.createProgram>[0])
      emit('success', created)
    }
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
    :title="isEditMode ? 'Edit Program' : 'Create Program'"
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
            placeholder="e.g. Push Day A"
            autofocus
          />
        </UFormField>

        <UFormField label="Description" name="description" class="mb-4">
          <UTextarea
            v-model="state.description"
            placeholder="Optional description..."
            :rows="2"
          />
        </UFormField>

        <UFormField label="Folder" name="folderId" class="mb-6">
          <USelect
            v-model="state.folderId"
            :items="folderItems"
            placeholder="No folder"
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
            :label="isEditMode ? 'Save Changes' : 'Create Program'"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
