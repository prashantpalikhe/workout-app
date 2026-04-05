<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(false)
const mobileHeaderTitle = useState<string>('mobile-header-title', () => '')

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
    active: route.path.startsWith('/exercises')
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
  // {
  //   label: 'Records',
  //   icon: 'i-lucide-trophy',
  //   to: '/records',
  //   active: route.path === '/records'
  // },
  // TODO: Re-enable when trainer view is ready
  // ...(authStore.user?.isTrainer
  //   ? [
  //       {
  //         label: 'Athletes',
  //         icon: 'i-lucide-users',
  //         to: '/trainer/athletes',
  //         active: route.path.startsWith('/trainer')
  //       }
  //     ]
  //   : []),
  {
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile',
    active: route.path === '/profile'
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
        <NuxtLink
          to="/dashboard"
          class="flex items-center gap-2"
          :class="collapsed ? 'justify-center w-full' : ''"
        >
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

        <div class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <div
          v-if="authStore.user"
          class="flex items-center w-full"
          :class="collapsed ? 'justify-center' : 'gap-2'"
        >
          <NuxtLink to="/profile" class="flex items-center gap-2 min-w-0 flex-1" :class="collapsed ? 'justify-center' : ''">
            <UAvatar
              :src="authStore.user?.avatarUrl || undefined"
              :alt="authStore.fullName"
              size="sm"
              class="shrink-0"
            />
            <span v-if="!collapsed" class="text-sm font-medium truncate">{{
              authStore.fullName
            }}</span>
          </NuxtLink>
          <UButton
            v-if="!collapsed"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Logout"
            @click="authStore.logout()"
          />
        </div>
        <div
          v-else
          class="flex items-center w-full"
          :class="collapsed ? 'justify-center' : 'gap-2'"
        >
          <USkeleton class="size-8 rounded-full shrink-0" />
          <template v-if="!collapsed">
            <USkeleton class="h-4 flex-1 rounded" />
          </template>
        </div>
      </template>
    </UDashboardSidebar>

    <div class="flex-1 overflow-y-auto min-h-svh">
      <!-- Mobile header with hamburger -->
      <div
        class="lg:hidden flex items-center gap-2 px-4 h-(--ui-header-height) border-b border-default"
      >
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Open menu"
          @click="sidebarOpen = true"
        />
        <div class="flex-1 min-w-0 flex items-center gap-2">
          <template v-if="mobileHeaderTitle">
            <span class="font-semibold truncate">{{ mobileHeaderTitle }}</span>
          </template>
          <template v-else>
            <div class="size-6 rounded-full bg-primary shrink-0" />
            <span class="font-semibold">Workout</span>
          </template>
        </div>
        <div id="mobile-header-actions" class="flex items-center gap-1 shrink-0" />
      </div>

      <slot />
    </div>
  </UDashboardGroup>
</template>
