<script setup lang="ts">
import { registerInputSchema } from '@workout/shared'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const authStore = useAuthStore()
const toast = useToast()

const registerFormSchema = registerInputSchema.omit({ role: true })

const state = reactive({
  email: '',
  password: '',
  firstName: '',
  lastName: ''
})
const error = ref('')

type RegisterData = {
  email: string
  password: string
  firstName: string
  lastName: string
}

async function onSubmit(event: FormSubmitEvent<RegisterData>) {
  error.value = ''
  try {
    await authStore.register(event.data)
    toast.add({ title: 'Account created!', color: 'success' })
    navigateTo('/dashboard')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Registration failed. Please try again.'
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-2xl font-bold text-center">
        Create Account
      </h1>
      <p class="text-sm text-muted text-center mt-1">
        Start tracking your workouts today
      </p>
    </template>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4"
    />

    <UForm :schema="registerFormSchema" :state="state" @submit="onSubmit">
      <div class="grid grid-cols-2 gap-4 mb-4">
        <UFormField label="First Name" name="firstName">
          <UInput
            v-model="state.firstName"
            placeholder="John"
            icon="i-lucide-user"
            autofocus
          />
        </UFormField>

        <UFormField label="Last Name" name="lastName">
          <UInput
            v-model="state.lastName"
            placeholder="Doe"
            icon="i-lucide-user"
          />
        </UFormField>
      </div>

      <UFormField label="Email" name="email" class="mb-4">
        <UInput
          v-model="state.email"
          type="email"
          placeholder="you@example.com"
          icon="i-lucide-mail"
        />
      </UFormField>

      <UFormField label="Password" name="password" class="mb-6" hint="Minimum 8 characters">
        <UInput
          v-model="state.password"
          type="password"
          placeholder="Choose a strong password"
          icon="i-lucide-lock"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Create Account"
        block
        :loading="authStore.loading"
      />
    </UForm>

    <template #footer>
      <p class="text-sm text-center text-muted">
        Already have an account?
        <NuxtLink to="/login" class="text-primary font-medium">
          Sign in
        </NuxtLink>
      </p>
    </template>
  </UCard>
</template>
