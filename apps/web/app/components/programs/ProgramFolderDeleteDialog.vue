<script setup lang="ts">
import type { ProgramFolder } from '~/stores/programs'

defineProps<{
  folder: ProgramFolder | null
}>()

const emit = defineEmits<{
  confirm: []
}>()

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Delete Folder"
  >
    <template #body>
      <p>
        Are you sure you want to delete the folder
        <strong>{{ folder?.name }}</strong>?
        Programs in this folder will become unfiled. This action cannot be undone.
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          icon="i-lucide-trash-2"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
