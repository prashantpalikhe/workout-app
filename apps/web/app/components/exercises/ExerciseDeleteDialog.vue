<script setup lang="ts">
import type { Exercise } from '~/stores/exercises'

defineProps<{
  exercise: Exercise | null
}>()

const emit = defineEmits<{
  confirm: []
}>()

const open = defineModel<boolean>({ default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Delete Exercise"
  >
    <template #body>
      <p>
        Are you sure you want to delete
        <strong>{{ exercise?.name }}</strong>?
        This action cannot be undone.
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
