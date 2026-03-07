<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(false)

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Dashboard',
    icon: 'i-lucide-house',
    to: '/dashboard',
    active: route.path === '/dashboard'
  },
  {
    label: 'Exercises',
    icon: 'i-lucide-dumbbell',
    to: '/exercises',
    active: route.path === '/exercises'
  },
  {
    label: 'Programs',
    icon: 'i-lucide-clipboard-list',
    to: '/programs',
    active: route.path.startsWith('/programs')
  },
  {
    label: 'Sessions',
    icon: 'i-lucide-timer',
    to: '/sessions',
    active: route.path.startsWith('/sessions')
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    active: route.path === '/settings'
  }
])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      v-model:open="sidebarOpen"
      collapsible
      resizable
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/dashboard" class="flex items-center gap-2" :class="collapsed ? 'justify-center w-full' : ''">
          <div class="size-8 rounded-full bg-primary shrink-0" />
          <span v-if="!collapsed" class="font-semibold text-lg truncate">Workout</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems"
          orientation="vertical"
        />

        <div class="mt-auto">
          <UColorModeButton
            :class="collapsed ? 'mx-auto' : ''"
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <div class="flex items-center w-full" :class="collapsed ? 'justify-center' : 'gap-2'">
          <UAvatar
            :src="authStore.user?.avatarUrl || undefined"
            :alt="authStore.fullName"
            size="sm"
            class="shrink-0"
          />
          <template v-if="!collapsed">
            <span class="text-sm font-medium truncate flex-1">{{ authStore.fullName }}</span>
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Logout"
              @click="authStore.logout()"
            />
          </template>
        </div>
      </template>
    </UDashboardSidebar>

    <div class="flex-1 overflow-y-auto min-h-svh">
      <!-- Mobile header with hamburger -->
      <div class="lg:hidden flex items-center gap-2 px-4 h-(--ui-header-height) border-b border-default">
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Open menu"
          @click="sidebarOpen = true"
        />
        <div class="size-6 rounded-full bg-primary shrink-0" />
        <span class="font-semibold">Workout</span>
      </div>

      <slot />
    </div>
  </UDashboardGroup>
</template>
