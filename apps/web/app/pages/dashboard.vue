<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const sessionStore = useSessionStore()

onMounted(() => {
  sessionStore.fetchActive()
})
</script>

<template>
  <UContainer>
    <AppPageHeader
      :title="`Hey, ${authStore.user?.firstName}!`"
      description="Your workout dashboard"
    />

    <!-- Active session resume card -->
    <NuxtLink
      v-if="sessionStore.hasActiveSession"
      to="/sessions/active"
      class="block"
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
          <UButton label="Resume" icon="i-lucide-play" />
        </div>
      </UCard>
    </NuxtLink>

    <!-- Start workout CTA -->
    <UCard
      v-else
      class="hover:bg-elevated transition-colors cursor-pointer border-primary/30"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="size-10 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <UIcon name="i-lucide-dumbbell" class="size-5 text-primary" />
          </div>
          <div>
            <p class="font-medium">Ready to work out?</p>
            <p class="text-sm text-muted">Start a new session</p>
          </div>
        </div>
        <AppStartWorkoutButton />
      </div>
    </UCard>
  </UContainer>
</template>
