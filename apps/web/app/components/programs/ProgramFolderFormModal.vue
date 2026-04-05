<script setup lang="ts">
import { z } from 'zod'
import { createProgramFolderInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'
import type { ProgramFolder } from '~/stores/programs'

const props = defineProps<{
  folder: ProgramFolder | null
}>()

const emit = defineEmits<{
  success: []
}>()

const open = defineModel<boolean>({ default: false })

const programStore = useProgramStore()

const isEditMode = computed(() => !!props.folder)

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
  createProgramFolderInputSchema
)

const state = reactive({
  name: ''
})

const error = ref('')
const submitting = ref(false)

watch(
  () => props.folder,
  (f) => {
    if (f) {
      state.name = f.name
    } else {
      state.name = ''
    }
    error.value = ''
  }
)

type FormData = {
  name: string
}

async function onSubmit(event: FormSubmitEvent<FormData>) {
  error.value = ''
  submitting.value = true

  try {
    if (isEditMode.value && props.folder) {
      await programStore.updateFolder(props.folder.id, event.data)
    } else {
      await programStore.createFolder(event.data)
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
    :title="isEditMode ? 'Edit Folder' : 'Create Folder'"
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
        <UFormField label="Name" name="name" class="mb-6">
          <UInput
            v-model="state.name"
            placeholder="e.g. Push/Pull/Legs"
            autofocus
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
            :label="isEditMode ? 'Save Changes' : 'Create Folder'"
            :loading="submitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
