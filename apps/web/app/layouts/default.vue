<script setup lang="ts">
const authStore = useAuthStore()

const userMenuItems = computed(() => [
  [{
    label: authStore.fullName,
    slot: 'account',
    disabled: true
  }],
  [{
    label: 'Logout',
    icon: 'i-lucide-log-out',
    onSelect: () => authStore.logout()
  }]
])
</script>

<template>
  <div>
    <UHeader>
      <template #left>
        <NuxtLink to="/dashboard">
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>

        <nav class="flex items-center gap-1 ml-4">
          <UButton
            to="/exercises"
            label="Exercises"
            icon="i-lucide-dumbbell"
            color="neutral"
            variant="ghost"
            size="sm"
          />
          <UButton
            to="/programs"
            label="Programs"
            icon="i-lucide-clipboard-list"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </nav>
      </template>

      <template #right>
        <UColorModeButton />

        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'end' }"
        >
          <UButton
            :label="authStore.user?.firstName"
            icon="i-lucide-user"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Workout App &copy; {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </div>
</template>
