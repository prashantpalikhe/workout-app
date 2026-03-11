<script setup lang="ts">
import { resetPasswordInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const route = useRoute()
const config = useRuntimeConfig()
const baseURL = config.public.apiBaseUrl as string
const toast = useToast()

const token = computed(() => (route.query.token as string) || '')
const state = reactive({ password: '', confirmPassword: '' })
const error = ref('')
const loading = ref(false)

type ResetData = { password: string }

async function onSubmit(event: FormSubmitEvent<ResetData>) {
  if (state.password !== state.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  error.value = ''
  loading.value = true
  try {
    await $fetch('/auth/reset-password', {
      baseURL,
      method: 'POST',
      body: { token: token.value, password: event.data.password }
    })
    toast.add({ title: 'Password reset successfully!', color: 'success' })
    navigateTo('/login')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Invalid or expired reset link. Please request a new one.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-2xl font-bold text-center">Set New Password</h1>
      <p class="text-sm text-muted text-center mt-1">
        Choose a new password for your account
      </p>
    </template>

    <UAlert
      v-if="!token"
      color="error"
      icon="i-lucide-alert-circle"
      title="Missing reset token. Please use the link from your email."
      class="mb-4"
    />

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4"
    />

    <UForm
      :schema="resetPasswordInputSchema"
      :state="{ token: token, password: state.password }"
      :validate-on="['change']"
      class="grid gap-4"
      @submit="onSubmit"
    >
      <UFormField label="New Password" name="password">
        <UInput
          v-model="state.password"
          class="block"
          type="password"
          autofocus
          variant="soft"
          size="lg"
        />
      </UFormField>

      <UFormField label="Confirm Password" name="confirmPassword" class="mb-6">
        <UInput
          v-model="state.confirmPassword"
          class="block"
          type="password"
          variant="soft"
          size="lg"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Reset Password"
        block
        :loading
        :disabled="!token"
      />
    </UForm>

    <template #footer>
      <p class="text-sm text-center text-muted">
        <NuxtLink to="/login" class="text-primary font-medium">
          Back to Sign In
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
