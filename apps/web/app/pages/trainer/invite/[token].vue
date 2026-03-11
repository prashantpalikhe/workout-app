<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const { api } = useApiClient()
const toast = useToast()

const token = route.params.token as string
const loading = ref(true)
const accepting = ref(false)
const accepted = ref(false)
const error = ref('')

interface InviteInfo {
  id: string
  trainer: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
  expiresAt: string
}

const inviteInfo = ref<InviteInfo | null>(null)

onMounted(async () => {
  try {
    inviteInfo.value = await api<InviteInfo>(`/trainer/invites/${token}/info`)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'This invite link is invalid or has expired.'
  } finally {
    loading.value = false
  }
})

async function acceptInvite() {
  accepting.value = true
  try {
    await api(`/trainer/invites/${token}/accept`, { method: 'POST' })
    accepted.value = true
    toast.add({ title: 'Connected with trainer!', color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to accept invite. Please try again.'
  } finally {
    accepting.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto p-4 sm:p-6 mt-12">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <!-- Error -->
    <UCard v-else-if="error && !inviteInfo">
      <div class="text-center py-6 space-y-4">
        <div class="size-14 rounded-full bg-error/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-link-2-off" class="size-7 text-error" />
        </div>
        <div>
          <p class="font-semibold text-lg">Invalid Invite</p>
          <p class="text-sm text-muted mt-1">{{ error }}</p>
        </div>
        <UButton
          label="Go to Dashboard"
          to="/dashboard"
          variant="outline"
          color="neutral"
        />
      </div>
    </UCard>

    <!-- Accepted -->
    <UCard v-else-if="accepted">
      <div class="text-center py-6 space-y-4">
        <div class="size-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <UIcon name="i-lucide-check-circle-2" class="size-7 text-success" />
        </div>
        <div>
          <p class="font-semibold text-lg">Connected!</p>
          <p class="text-sm text-muted mt-1">
            You are now connected with
            <span class="font-medium">{{ inviteInfo?.trainer.firstName }} {{ inviteInfo?.trainer.lastName }}</span>
          </p>
        </div>
        <div class="flex gap-2 justify-center">
          <UButton
            label="View My Trainers"
            to="/athlete/trainers"
          />
          <UButton
            label="Go to Dashboard"
            to="/dashboard"
            variant="outline"
            color="neutral"
          />
        </div>
      </div>
    </UCard>

    <!-- Invite Info + Accept -->
    <UCard v-else-if="inviteInfo">
      <div class="text-center py-4 space-y-5">
        <div class="space-y-3">
          <UAvatar
            :src="inviteInfo.trainer.avatarUrl || undefined"
            :alt="`${inviteInfo.trainer.firstName} ${inviteInfo.trainer.lastName}`"
            size="xl"
            class="mx-auto"
          />
          <div>
            <p class="font-semibold text-lg">
              {{ inviteInfo.trainer.firstName }} {{ inviteInfo.trainer.lastName }}
            </p>
            <p class="text-sm text-muted">invites you to connect as their athlete</p>
          </div>
        </div>

        <UAlert
          v-if="error"
          color="error"
          :title="error"
          class="text-left"
        />

        <div class="space-y-2">
          <UButton
            label="Accept Invite"
            icon="i-lucide-user-plus"
            block
            :loading="accepting"
            @click="acceptInvite"
          />
          <UButton
            label="Decline"
            to="/dashboard"
            block
            variant="outline"
            color="neutral"
          />
        </div>

        <p class="text-xs text-muted">
          By accepting, your trainer will be able to view your workout data and log workouts on your behalf.
        </p>
      </div>
    </UCard>
  </div>
</template>
