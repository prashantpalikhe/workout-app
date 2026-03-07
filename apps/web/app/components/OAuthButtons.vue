<script setup lang="ts">
const error = defineModel<string | null>('error', { default: null })

const authStore = useAuthStore()
const { isAvailable: googleAvailable, renderButton: renderGoogleButton } = useGoogleAuth()
const { isAvailable: appleAvailable, promptLogin: applePromptLogin, loading: appleLoading } = useAppleAuth()

const googleButtonRef = ref<HTMLDivElement | null>(null)
const oauthLoading = ref(false)

const hasOAuth = computed(() => googleAvailable.value || appleAvailable.value)

// ── Google Sign-In ──────────────────────────────
async function handleGoogleCredential(idToken: string) {
  oauthLoading.value = true
  error.value = null
  try {
    await authStore.loginWithGoogle(idToken)
    navigateTo('/dashboard')
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Google sign-in failed'
  } finally {
    oauthLoading.value = false
  }
}

// Render Google button when the container ref is available
watch(googleButtonRef, async (el) => {
  if (el && googleAvailable.value) {
    try {
      await renderGoogleButton(el, handleGoogleCredential)
    } catch {
      // SDK failed to load (e.g. ad blocker) — button simply won't render
    }
  }
}, { immediate: true })

// ── Apple Sign-In ───────────────────────────────
async function handleAppleSignIn() {
  error.value = null
  try {
    const { idToken, firstName, lastName } = await applePromptLogin()
    oauthLoading.value = true
    await authStore.loginWithApple(idToken, firstName, lastName)
    navigateTo('/dashboard')
  } catch (err: unknown) {
    // User cancelled the popup — Apple throws an error with a specific code
    const appleError = err as { error?: string }
    if (appleError?.error === 'popup_closed_by_user') return

    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Apple sign-in failed'
  } finally {
    oauthLoading.value = false
  }
}
</script>

<template>
  <div v-if="hasOAuth" class="space-y-3">
    <!-- Divider -->
    <div class="relative my-4">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-default" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="bg-default px-2 text-muted">or continue with</span>
      </div>
    </div>

    <!-- Google Sign-In (SDK renders its own button) -->
    <div
      v-if="googleAvailable"
      ref="googleButtonRef"
      class="flex justify-center"
    />

    <!-- Apple Sign-In -->
    <UButton
      v-if="appleAvailable"
      icon="i-simple-icons-apple"
      label="Continue with Apple"
      color="neutral"
      variant="outline"
      size="lg"
      block
      :loading="appleLoading"
      :disabled="oauthLoading"
      @click="handleAppleSignIn"
    />
  </div>
</template>
