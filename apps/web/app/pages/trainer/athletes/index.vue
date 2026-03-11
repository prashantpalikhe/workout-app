<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const trainerStore = useTrainerStore()

const statusFilter = ref<string | undefined>(undefined)
const statusTabs = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Inactive', value: 'INACTIVE' },
]

onMounted(() => {
  trainerStore.fetchAthletes()
})

async function onStatusChange(status: string | undefined) {
  statusFilter.value = status
  await trainerStore.fetchAthletes({ status })
}

async function loadPage(page: number) {
  await trainerStore.fetchAthletes({ status: statusFilter.value, page })
}

const statusColor: Record<string, string> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  PENDING: 'info',
  DISCONNECTED: 'error',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 sm:p-6">
    <UPageHeader
      title="Athletes"
      description="Manage your athlete connections"
    >
      <template #links>
        <UButton
          label="Invite Athlete"
          icon="i-lucide-user-plus"
          to="/trainer/athletes/invite"
        />
      </template>
    </UPageHeader>

    <div class="mt-6 space-y-4">
      <!-- Status filter tabs -->
      <div class="flex gap-2">
        <UButton
          v-for="tab in statusTabs"
          :key="tab.label"
          :label="tab.label"
          size="sm"
          :variant="statusFilter === tab.value ? 'solid' : 'outline'"
          :color="statusFilter === tab.value ? 'primary' : 'neutral'"
          @click="onStatusChange(tab.value)"
        />
      </div>

      <!-- Loading -->
      <div v-if="trainerStore.athletesLoading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="trainerStore.athletes.length === 0"
        class="text-center py-12"
      >
        <div class="size-14 rounded-full bg-elevated flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-lucide-users" class="size-7 text-muted" />
        </div>
        <p class="font-medium">No athletes yet</p>
        <p class="text-sm text-muted mt-1">
          Invite athletes to start training them
        </p>
        <UButton
          label="Invite Athlete"
          icon="i-lucide-user-plus"
          class="mt-4"
          to="/trainer/athletes/invite"
        />
      </div>

      <!-- Athletes List -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="rel in trainerStore.athletes"
          :key="rel.id"
          :to="`/trainer/athletes/${rel.athlete.id}`"
          class="block"
        >
          <UCard class="hover:bg-elevated transition-colors cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <UAvatar
                  :src="rel.athlete.avatarUrl || undefined"
                  :alt="`${rel.athlete.firstName} ${rel.athlete.lastName}`"
                  size="md"
                  class="shrink-0"
                />
                <div class="min-w-0">
                  <p class="font-medium truncate">
                    {{ rel.athlete.firstName }} {{ rel.athlete.lastName }}
                  </p>
                  <p class="text-sm text-muted truncate">
                    {{ rel.athlete.email }}
                  </p>
                  <p class="text-xs text-muted mt-0.5">
                    Connected {{ formatDate(rel.startedAt) }}
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
                <UIcon name="i-lucide-chevron-right" class="size-4 text-muted" />
              </div>
            </div>
          </UCard>
        </NuxtLink>

        <!-- Pagination -->
        <div
          v-if="trainerStore.athletesMeta.totalPages > 1"
          class="flex justify-center pt-4"
        >
          <UPagination
            :model-value="trainerStore.athletesMeta.page"
            :total="trainerStore.athletesMeta.total"
            :items-per-page="trainerStore.athletesMeta.limit"
            @update:model-value="loadPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
