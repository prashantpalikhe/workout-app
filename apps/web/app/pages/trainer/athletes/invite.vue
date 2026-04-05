<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const trainerStore = useTrainerStore()
const toast = useToast()
const _config = useRuntimeConfig()

const creating = ref(false)
const latestInvite = ref<{ token: string, url: string } | null>(null)
const copied = ref(false)

onMounted(() => {
  trainerStore.fetchInvites()
})

async function generateInvite() {
  creating.value = true
  try {
    const invite = await trainerStore.createInvite()
    latestInvite.value = { token: invite.token, url: invite.url }
    toast.add({ title: 'Invite link created', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to create invite', color: 'error' })
  } finally {
    creating.value = false
  }
}

function getInviteUrl(token: string) {
  const origin = window.location.origin
  return `${origin}/trainer/invite/${token}`
}

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(getInviteUrl(token))
    copied.value = true
    toast.add({ title: 'Link copied to clipboard', color: 'success' })
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Failed to copy link', color: 'error' })
  }
}

async function revokeInvite(inviteId: string) {
  try {
    await trainerStore.revokeInvite(inviteId)
    toast.add({ title: 'Invite revoked', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to revoke invite', color: 'error' })
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 sm:p-6">
    <UPageHeader
      title="Invite Athletes"
      description="Generate invite links to share with athletes"
    >
      <template #links>
        <UButton
          label="Back to Athletes"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          to="/trainer/athletes"
        />
      </template>
    </UPageHeader>

    <div class="mt-6 space-y-6">
      <!-- Generate Invite -->
      <UCard>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">
                Generate Invite Link
              </p>
              <p class="text-sm text-muted">
                Create a shareable link that athletes can use to connect with you
              </p>
            </div>
            <UButton
              label="Generate"
              icon="i-lucide-link"
              :loading="creating"
              @click="generateInvite"
            />
          </div>

          <!-- Latest generated invite -->
          <div
            v-if="latestInvite"
            class="p-4 bg-elevated rounded-lg space-y-3"
          >
            <p class="text-sm font-medium text-success">
              Invite link created!
            </p>
            <div class="flex gap-2">
              <UInput
                :model-value="getInviteUrl(latestInvite.token)"
                readonly
                class="flex-1"
                size="sm"
              />
              <UButton
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                :label="copied ? 'Copied' : 'Copy'"
                size="sm"
                variant="outline"
                @click="copyLink(latestInvite.token)"
              />
            </div>
            <p class="text-xs text-muted">
              This link expires in 7 days. Share it via message or email.
            </p>
          </div>
        </div>
      </UCard>

      <!-- Active Invites -->
      <UCard>
        <div class="space-y-4">
          <p class="font-medium">
            Active Invites
          </p>

          <div v-if="trainerStore.invitesLoading" class="flex justify-center py-6">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
          </div>

          <div v-else-if="trainerStore.invites.length === 0" class="text-center py-6">
            <UIcon name="i-lucide-mail-x" class="size-8 text-muted mx-auto mb-2" />
            <p class="text-sm text-muted">
              No active invites
            </p>
          </div>

          <div v-else class="divide-y divide-default">
            <div
              v-for="invite in trainerStore.invites"
              :key="invite.id"
              class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-mono truncate">
                  {{ getInviteUrl(invite.token) }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  Expires {{ formatDate(invite.expiresAt) }}
                </p>
              </div>
              <div class="flex items-center gap-1 ml-3 shrink-0">
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  aria-label="Copy link"
                  @click="copyLink(invite.token)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  variant="ghost"
                  color="error"
                  aria-label="Revoke invite"
                  @click="revokeInvite(invite.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
