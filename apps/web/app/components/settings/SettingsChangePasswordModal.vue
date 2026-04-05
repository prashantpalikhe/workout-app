<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const authStore = useAuthStore()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    error.value = ''
  }
})

const canSubmit = computed(() =>
  currentPassword.value.length > 0
  && newPassword.value.length >= 8
  && newPassword.value === confirmPassword.value
)

async function submit() {
  if (!canSubmit.value || saving.value) return
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'New password must be at least 8 characters'
    return
  }
  saving.value = true
  try {
    await authStore.changePassword(currentPassword.value, newPassword.value)
    toast.add({
      title: 'Password changed',
      description: 'Please sign in again with your new password',
      color: 'success'
    })
    open.value = false
    // changePassword() calls logout() which navigates to /login
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string }, statusCode?: number }
    if (fetchError.statusCode === 401) {
      error.value = 'Current password is incorrect'
    } else {
      error.value = fetchError?.data?.message || 'Failed to change password'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Change Password">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Current Password" required>
          <UInput
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full"
            autofocus
          />
        </UFormField>
        <UFormField label="New Password" required help="Minimum 8 characters">
          <UInput
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Confirm New Password" required>
          <UInput
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full"
            @keydown.enter="submit"
          />
        </UFormField>
        <UAlert
          v-if="error"
          :description="error"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
        />
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
          label="Change Password"
          size="sm"
          :loading="saving"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
