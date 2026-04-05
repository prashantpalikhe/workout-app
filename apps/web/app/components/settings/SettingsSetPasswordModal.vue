<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const authStore = useAuthStore()
const toast = useToast()

const password = ref('')
const confirmPassword = ref('')
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    password.value = ''
    confirmPassword.value = ''
    error.value = ''
  }
})

const canSubmit = computed(() =>
  password.value.length >= 8 && password.value === confirmPassword.value
)

async function submit() {
  if (!canSubmit.value || saving.value) return
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  saving.value = true
  try {
    await authStore.setPassword(password.value)
    toast.add({
      title: 'Password set',
      description: 'You can now sign in with email and password',
      color: 'success'
    })
    open.value = false
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to set password'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Set a Password">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          You currently sign in with Google. Set a password to also log in
          with your email.
        </p>
        <UFormField label="New Password" required help="Minimum 8 characters">
          <UInput
            v-model="password"
            type="password"
            autocomplete="new-password"
            class="w-full"
            autofocus
          />
        </UFormField>
        <UFormField label="Confirm Password" required>
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
          label="Set Password"
          size="sm"
          :loading="saving"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
