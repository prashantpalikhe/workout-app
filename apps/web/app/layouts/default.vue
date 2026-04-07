<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const route = useRoute()
const sidebarOpen = ref(false)
const mobileHeaderTitle = useState<string>('mobile-header-title', () => '')
const mobileHeaderBack = useState<string | null>(
  'mobile-header-back',
  () => null
)

function onMobileBack() {
  if (mobileHeaderBack.value) goBack(mobileHeaderBack.value)
}

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
  }
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
])

// Fetch active session on layout mount so sidebar + floating bar always know
onMounted(() => {
  if (authStore.user) {
    sessionStore.fetchActive()
  }
})


const footerNavItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    active: route.path === '/settings'
  },
  {
    label: 'Logout',
    icon: 'i-lucide-log-out',
    onSelect: () => authStore.logout()
  }
])
</script>

<template>
  <UDashboardGroup
    :ui="{
      root: 'flex min-h-svh lg:fixed lg:inset-0 lg:overflow-hidden'
    }"
  >
    <UDashboardSidebar
      v-model:open="sidebarOpen"
      collapsible
      resizable
      toggle-side="right"
      :ui="{
        footer: 'border-t border-default'
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/dashboard"
          class="flex items-center gap-2"
          :class="collapsed ? 'justify-center w-full' : ''"
        >
          <img
            src="/logo-light.svg"
            alt="Workout"
            class="size-8 shrink-0 object-contain block dark:hidden"
          >
          <img
            src="/logo-dark.svg"
            alt="Workout"
            class="size-8 shrink-0 object-contain hidden dark:block"
          >
          <span v-if="!collapsed" class="font-semibold text-lg truncate">
            Workout
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <!-- Profile card -->
        <NuxtLink
          v-if="authStore.user"
          to="/profile"
          class="mt-2 block transition-colors"
          :class="
            collapsed
              ? 'flex justify-center'
              : 'rounded-lg bg-accented hover:bg-muted p-3'
          "
        >
          <UAvatar
            v-if="collapsed"
            :src="authStore.user?.avatarUrl || undefined"
            :alt="authStore.fullName"
            size="sm"
          />
          <div v-else class="flex items-center gap-3">
            <UAvatar
              :src="authStore.user?.avatarUrl || undefined"
              :alt="authStore.fullName"
              size="lg"
              class="shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold truncate">
                {{ authStore.fullName }}
              </p>
              <p class="text-xs text-muted truncate">Athlete</p>
            </div>
          </div>
        </NuxtLink>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="navItems"
          orientation="vertical"
          :ui="{ link: 'py-2.5' }"
        />

        <div class="mt-auto" />

        <!-- Start / Resume Workout (hidden on active session page) -->
        <div
          v-if="!(sessionStore.hasActiveSession && route.path === '/sessions/active')"
          class="mx-2 mb-4"
          :class="collapsed ? 'flex justify-center' : ''"
        >
          <UButton
            v-if="sessionStore.hasActiveSession"
            label="Resume Workout"
            icon="i-lucide-play"
            color="primary"
            :block="!collapsed"
            to="/sessions/active"
          >
            <template v-if="collapsed" #default>
              <span class="sr-only">Resume Workout</span>
            </template>
          </UButton>
          <AppStartWorkoutButton
            v-else-if="!collapsed"
            label="Start Workout"
            block
            dropdown-side="top"
          />
          <UButton
            v-else
            icon="i-lucide-play"
            color="primary"
            variant="solid"
            size="sm"
            aria-label="Start Workout"
            @click="navigateTo('/sessions/active')"
          />
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="footerNavItems"
          orientation="vertical"
          :ui="{ link: 'py-2.5' }"
        />
      </template>

      <template #footer />
    </UDashboardSidebar>

    <div class="flex-1 lg:overflow-y-auto min-h-svh overscroll-y-none">
      <!-- Mobile header with hamburger -->
      <div
        class="lg:hidden sticky top-0 z-20 bg-default flex items-center gap-2 px-4 h-(--ui-header-height) border-b border-default"
        style="
          padding-top: env(safe-area-inset-top);
          height: calc(var(--ui-header-height) + env(safe-area-inset-top));
        "
      >
        <UButton
          v-if="mobileHeaderBack"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          aria-label="Back"
          @click="onMobileBack"
        />
        <UButton
          v-else
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          aria-label="Open menu"
          @click="sidebarOpen = true"
        />
        <div class="flex-1 min-w-0 flex items-center gap-2">
          <template v-if="mobileHeaderTitle">
            <span class="font-semibold truncate">{{ mobileHeaderTitle }}</span>
          </template>
          <template v-else>
            <img
              src="/logo-light.svg"
              alt="Workout"
              class="size-6 shrink-0 object-contain block dark:hidden"
            >
            <img
              src="/logo-dark.svg"
              alt="Workout"
              class="size-6 shrink-0 object-contain hidden dark:block"
            >
            <span class="font-semibold">Workout</span>
          </template>
        </div>
        <div
          id="mobile-header-actions"
          class="flex items-center gap-1 shrink-0"
        />
      </div>

      <div class="py-4 sm:py-6" :class="sessionStore.hasActiveSession ? 'pb-24' : ''">
        <slot />
      </div>

      <!-- Unified active session bar (floating, persists across pages) -->
      <SessionsActiveSessionBar />
    </div>
  </UDashboardGroup>
</template>
