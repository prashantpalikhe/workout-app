<script setup lang="ts">
import { forgotPasswordInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const config = useRuntimeConfig()
const baseURL = config.public.apiBaseUrl as string

const state = reactive({ email: '' })
const error = ref('')
const submitted = ref(false)
const loading = ref(false)

type ForgotData = { email: string }

async function onSubmit(event: FormSubmitEvent<ForgotData>) {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/auth/forgot-password', {
      baseURL,
      method: 'POST',
      body: { email: event.data.email }
    })
    submitted.value = true
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-2xl font-bold text-center">Reset Password</h1>
      <p class="text-sm text-muted text-center mt-1">
        Enter your email and we'll send you a reset link
      </p>
    </template>

    <!-- Success state -->
    <div v-if="submitted" class="text-center py-4">
      <UIcon name="i-lucide-mail-check" class="size-12 text-success mx-auto mb-3" />
      <p class="text-sm text-muted">
        If an account with that email exists, we've sent a password reset link.
        Check your inbox.
      </p>
    </div>

    <!-- Form state -->
    <template v-else>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        :title="error"
        class="mb-4"
      />

      <UForm
        :schema="forgotPasswordInputSchema"
        :state
        :validate-on="['change']"
        class="grid gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            class="block"
            type="email"
            autofocus
            variant="soft"
            size="lg"
          />
        </UFormField>

        <UButton
          type="submit"
          label="Send Reset Link"
          block
          :loading
        />
      </UForm>
    </template>

    <template #footer>
      <p class="text-sm text-center text-muted">
        Remember your password?
        <NuxtLink to="/login" class="text-primary font-medium">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
