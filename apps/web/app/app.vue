<script setup>
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Workout App'
const description
  = 'Track your workouts, monitor progress, and achieve your fitness goals.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

// PWA service worker registration
const { needsRefresh, init: initPwa, applyUpdate, dismissUpdate } = usePwa()
onMounted(() => initPwa())
</script>

<template>
  <UApp :data-vaul-drawer-wrapper="true">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- PWA update prompt -->
    <div
      v-if="needsRefresh"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-default border border-default rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-sm w-full mx-4"
    >
      <p class="text-sm flex-1">
        A new version is available.
      </p>
      <UButton size="xs" variant="ghost" color="neutral" label="Later" @click="dismissUpdate" />
      <UButton size="xs" color="primary" label="Update" @click="applyUpdate" />
    </div>
  </UApp>
</template>
