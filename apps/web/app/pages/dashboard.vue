<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const router = useRouter()

const showStartModal = ref(false)

onMounted(() => {
  sessionStore.fetchActive()
})

function onSessionStarted() {
  router.push('/sessions/active')
}
</script>

<template>
  <UContainer>
    <UPageHeader
      :title="`Welcome, ${authStore.user?.firstName}!`"
      description="Your workout dashboard"
    />

    <!-- Active session resume card -->
    <NuxtLink
      v-if="sessionStore.hasActiveSession"
      to="/sessions/active"
      class="block mt-6"
    >
      <UCard
        class="hover:bg-elevated transition-colors cursor-pointer border-primary/30"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon name="i-lucide-timer" class="size-5 text-primary" />
            </div>
            <div>
              <p class="font-medium">Active Workout</p>
              <p class="text-sm text-muted">
                {{ sessionStore.activeSession!.name }}
              </p>
            </div>
          </div>
          <UButton label="Resume" icon="i-lucide-play" size="sm" />
        </div>
      </UCard>
    </NuxtLink>

    <!-- Start workout CTA -->
    <UCard v-else class="mt-6">
      <div class="grid items-center justify-between sm:grid-cols-2 gap-4">
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-full bg-elevated flex items-center justify-center"
          >
            <UIcon name="i-lucide-dumbbell" class="size-5 text-muted" />
          </div>
          <div>
            <p class="font-medium">
              Ready to work out?
            </p>
            <p class="text-sm text-muted">
              Start a new workout session
            </p>
          </div>
        </div>
        <UButton
          label="Start Workout"
          icon="i-lucide-play"
          class="sm:w-max sm:justify-self-end"
          @click="showStartModal = true"
        />
      </div>
    </UCard>

    <!-- User info -->
    <UCard class="mt-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UAvatar
            :src="authStore.user?.avatarUrl || undefined"
            :alt="authStore.fullName"
            size="lg"
          />
          <div>
            <p class="text-lg font-medium">
              {{ authStore.fullName }}
            </p>
            <p class="text-sm text-muted">
              {{ authStore.user?.email }}
            </p>
            <p v-if="authStore.isTrainer" class="text-sm text-muted mt-1">
              <UBadge
                label="Trainer"
                color="primary"
                variant="subtle"
                size="xs"
              />
            </p>
          </div>
        </div>
        <UButton
          label="Logout"
          icon="i-lucide-log-out"
          color="neutral"
          variant="outline"
          @click="authStore.logout"
        />
      </div>
    </UCard>

    <SessionsSessionStartModal
      v-model="showStartModal"
      @started="onSessionStarted"
    />
  </UContainer>
</template>
