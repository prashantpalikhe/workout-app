<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const authStore = useAuthStore()
const toast = useToast()

const confirmText = ref('')
const deleting = ref(false)

watch(open, (isOpen) => {
  if (isOpen) confirmText.value = ''
})

const canDelete = computed(() => confirmText.value === 'DELETE')

async function submit() {
  if (!canDelete.value || deleting.value) return
  deleting.value = true
  try {
    await authStore.deleteAccount()
    toast.add({
      title: 'Account deleted',
      description: 'Your account and all data have been permanently removed',
      color: 'success'
    })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: fetchError?.data?.message || 'Failed to delete account',
      color: 'error'
    })
    deleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Account">
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-alert-triangle"
          title="This cannot be undone"
          description="Your workouts, programs, personal records, and all associated data will be permanently deleted."
        />
        <UFormField
          label="Type &quot;DELETE&quot; to confirm"
          required
        >
          <UInput
            v-model="confirmText"
            placeholder="DELETE"
            class="w-full"
            autofocus
            @keydown.enter="submit"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          size="sm"
          @click="open = false"
        />
        <UButton
          label="Delete Account"
          color="error"
          size="sm"
          :loading="deleting"
          :disabled="!canDelete"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
