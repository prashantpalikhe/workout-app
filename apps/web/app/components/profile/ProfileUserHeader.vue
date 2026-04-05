<script setup lang="ts">
import type { AthleteProfile } from '~/stores/profile'

defineProps<{
  profile: AthleteProfile | null
}>()

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const initials = computed(() => {
  if (!user.value) return '?'
  return `${user.value.firstName.charAt(0)}${user.value.lastName.charAt(0)}`
})

const _memberSince = computed(() => {
  if (!user.value) return ''
  // We'll use profile store's stats.memberSince or fallback
  return ''
})
</script>

<template>
  <div class="flex items-start gap-4">
    <UAvatar
      :src="user?.avatarUrl || undefined"
      :text="initials"
      size="3xl"
    />
    <div class="min-w-0 flex-1">
      <h2 class="text-xl font-bold">
        {{ authStore.fullName }}
      </h2>
      <p class="text-sm text-muted">
        {{ user?.email }}
      </p>
      <p v-if="profile?.bio" class="text-sm mt-2">
        {{ profile.bio }}
      </p>
      <a
        v-if="profile?.link"
        :href="profile.link"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
      >
        <UIcon name="i-lucide-link" class="size-3.5" />
        {{ profile.link.replace(/^https?:\/\//, '') }}
      </a>
    </div>
  </div>
</template>
