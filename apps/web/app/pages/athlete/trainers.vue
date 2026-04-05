<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { api } = useApiClient()
const toast = useToast()

interface TrainerRelationship {
  id: string
  status: string
  startedAt: string
  endedAt: string | null
  trainer: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
}

const loading = ref(true)
const trainers = ref<TrainerRelationship[]>([])
const disconnecting = ref<string | null>(null)
const showDisconnectConfirm = ref(false)
const selectedRelationship = ref<TrainerRelationship | null>(null)

onMounted(async () => {
  try {
    trainers.value = await api<TrainerRelationship[]>('/athlete/trainers')
  } catch {
    toast.add({ title: 'Failed to load trainers', color: 'error' })
  } finally {
    loading.value = false
  }
})

function confirmDisconnect(relationship: TrainerRelationship) {
  selectedRelationship.value = relationship
  showDisconnectConfirm.value = true
}

async function disconnect() {
  if (!selectedRelationship.value) return
  const rel = selectedRelationship.value
  disconnecting.value = rel.id
  showDisconnectConfirm.value = false

  try {
    await api(`/athlete/trainers/${rel.id}/disconnect`, { method: 'POST' })
    // Remove from list
    trainers.value = trainers.value.filter(t => t.id !== rel.id)
    toast.add({ title: 'Disconnected from trainer', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to disconnect', color: 'error' })
  } finally {
    disconnecting.value = null
    selectedRelationship.value = null
  }
}

const statusColor: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  PENDING: 'info'
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 sm:p-6">
    <AppPageHeader
      title="My Trainers"
      description="View and manage your trainer connections"
    />

    <div class="mt-6">
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <div v-else-if="trainers.length === 0" class="text-center py-12">
        <div class="size-14 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-users" class="size-7 text-muted" />
        </div>
        <p class="font-medium">
          No trainers yet
        </p>
        <p class="text-sm text-muted mt-1">
          Ask your trainer for an invite link to get connected
        </p>
      </div>

      <div v-else class="space-y-3">
        <UCard
          v-for="rel in trainers"
          :key="rel.id"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <UAvatar
                :src="rel.trainer.avatarUrl || undefined"
                :alt="`${rel.trainer.firstName} ${rel.trainer.lastName}`"
                size="md"
                class="shrink-0"
              />
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ rel.trainer.firstName }} {{ rel.trainer.lastName }}
                </p>
                <p class="text-sm text-muted truncate">
                  {{ rel.trainer.email }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 ml-3">
              <UBadge
                :label="rel.status"
                :color="statusColor[rel.status] || 'neutral'"
                variant="subtle"
                size="xs"
              />
              <UButton
                v-if="rel.status === 'ACTIVE'"
                icon="i-lucide-unlink"
                size="xs"
                variant="ghost"
                color="error"
                aria-label="Disconnect"
                :loading="disconnecting === rel.id"
                @click="confirmDisconnect(rel)"
              />
            </div>
          </div>

          <!-- Explanation for INACTIVE status -->
          <p v-if="rel.status === 'INACTIVE'" class="text-xs text-muted mt-2">
            This trainer has deactivated their trainer mode. They may reactivate it later.
          </p>
        </UCard>
      </div>
    </div>

    <!-- Disconnect Confirmation Modal -->
    <UModal v-model:open="showDisconnectConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-unlink" class="size-5 text-error" />
            </div>
            <div>
              <p class="font-semibold">
                Disconnect from Trainer?
              </p>
              <p class="text-sm text-muted mt-1">
                This will permanently remove
                <span class="font-medium">{{ selectedRelationship?.trainer.firstName }} {{ selectedRelationship?.trainer.lastName }}</span>
                as your trainer. This action cannot be undone.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="showDisconnectConfirm = false"
            />
            <UButton
              label="Disconnect"
              color="error"
              @click="disconnect"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
