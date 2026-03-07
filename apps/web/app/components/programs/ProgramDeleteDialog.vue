<script setup lang="ts">
import type { Program } from '~/stores/programs'

defineProps<{
  program: Program | null
}>()

const emit = defineEmits<{
  confirm: []
}>()

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Delete Program"
  >
    <template #body>
      <p>
        Are you sure you want to delete
        <strong>{{ program?.name }}</strong>?
        This will also remove all exercises from this program. This action cannot be undone.
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
