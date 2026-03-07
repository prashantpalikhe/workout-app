<script setup>
definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
</script>

<template>
  <UContainer>
    <UPageHeader
      :title="`Welcome, ${authStore.user?.firstName}!`"
      description="Your workout dashboard"
    />

    <UCard class="mt-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-lg font-medium">
            {{ authStore.fullName }}
          </p>
          <p class="text-sm text-muted">
            {{ authStore.user?.email }}
          </p>
          <p class="text-sm text-muted mt-1">
            Role: {{ authStore.user?.role }}
          </p>
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
  </UContainer>
</template>
