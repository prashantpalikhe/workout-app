<script setup lang="ts">
import { loginInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const authStore = useAuthStore()
const toast = useToast()

const state = reactive({
  email: '',
  password: ''
})
const error = ref('')

type LoginData = {
  email: string
  password: string
}

async function onSubmit(event: FormSubmitEvent<LoginData>) {
  error.value = ''
  try {
    await authStore.login(event.data.email, event.data.password)
    toast.add({ title: 'Welcome back!', color: 'success' })
    navigateTo('/dashboard')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Invalid email or password'
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-2xl font-bold text-center">
        Sign In
      </h1>
      <p class="text-sm text-muted text-center mt-1">
        Enter your credentials to continue
      </p>
    </template>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4"
    />

    <UForm
      :schema="loginInputSchema"
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

      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          class="block"
          type="password"
          variant="soft"
          size="lg"
        />
      </UFormField>

      <div class="text-right mb-2">
        <NuxtLink to="/forgot-password" class="text-sm text-primary font-medium">
          Forgot password?
        </NuxtLink>
      </div>

      <UButton
        type="submit"
        label="Sign In"
        block
        :loading="authStore.loading"
      />
    </UForm>

    <OAuthButtons v-model:error="error" />

    <template #footer>
      <p class="text-sm text-center text-muted">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary font-medium">
          Sign up
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
