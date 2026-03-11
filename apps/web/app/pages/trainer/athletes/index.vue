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

// ── Group Session Selection Mode ──

const selectionMode = ref(false)
const selectedAthleteIds = ref(new Set<string>())
const MAX_GROUP_SIZE = 3

function enterSelectionMode() {
  selectionMode.value = true
  selectedAthleteIds.value.clear()
}

function cancelSelection() {
  selectionMode.value = false
  selectedAthleteIds.value.clear()
}

function toggleSelection(athleteId: string, event: Event) {
  event.preventDefault()
  event.stopPropagation()

  if (selectedAthleteIds.value.has(athleteId)) {
    selectedAthleteIds.value.delete(athleteId)
  } else if (selectedAthleteIds.value.size < MAX_GROUP_SIZE) {
    selectedAthleteIds.value.add(athleteId)
  }
  // Force reactivity
  selectedAthleteIds.value = new Set(selectedAthleteIds.value)
}

function startGroupSession() {
  const ids = Array.from(selectedAthleteIds.value).join(',')
  navigateTo(`/trainer/group-session?athletes=${ids}`)
}

// Only ACTIVE athletes can be selected for group sessions
function isSelectable(status: string) {
  return status === 'ACTIVE'
}

const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 sm:p-6">
    <UPageHeader
      title="Athletes"
      description="Manage your athlete connections"
    >
      <template #links>
        <UButton
          v-if="!selectionMode"
          label="Group Session"
          icon="i-lucide-users"
          variant="outline"
          @click="enterSelectionMode"
        />
        <UButton
          label="Invite Athlete"
          icon="i-lucide-user-plus"
          to="/trainer/athletes/invite"
        />
      </template>
    </UPageHeader>

    <!-- Selection mode banner -->
    <div
      v-if="selectionMode"
      class="mt-4 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-sm"
    >
      <UIcon name="i-lucide-mouse-pointer-click" class="size-4 text-primary shrink-0" />
      <span>Select up to {{ MAX_GROUP_SIZE }} athletes for a group session</span>
      <UButton
        label="Cancel"
        size="xs"
        variant="ghost"
        color="neutral"
        class="ml-auto"
        @click="cancelSelection"
      />
    </div>

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
        <component
          :is="selectionMode ? 'div' : NuxtLink"
          v-for="rel in trainerStore.athletes"
          :key="rel.id"
          :to="selectionMode ? undefined : `/trainer/athletes/${rel.athlete.id}`"
          class="block"
          :class="selectionMode && isSelectable(rel.status) ? 'cursor-pointer' : ''"
          @click="selectionMode && isSelectable(rel.status) ? toggleSelection(rel.athlete.id, $event) : undefined"
        >
          <UCard
            class="transition-colors"
            :class="{
              'hover:bg-elevated cursor-pointer': !selectionMode,
              'ring-2 ring-primary bg-primary/5': selectionMode && selectedAthleteIds.has(rel.athlete.id),
              'opacity-40': selectionMode && !isSelectable(rel.status),
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <!-- Selection checkbox -->
                <div
                  v-if="selectionMode"
                  class="shrink-0"
                >
                  <div
                    class="size-5 rounded border-2 flex items-center justify-center transition-colors"
                    :class="selectedAthleteIds.has(rel.athlete.id)
                      ? 'bg-primary border-primary text-white'
                      : 'border-default'"
                  >
                    <UIcon
                      v-if="selectedAthleteIds.has(rel.athlete.id)"
                      name="i-lucide-check"
                      class="size-3.5"
                    />
                  </div>
                </div>

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
                <UIcon v-if="!selectionMode" name="i-lucide-chevron-right" class="size-4 text-muted" />
              </div>
            </div>
          </UCard>
        </component>

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

    <!-- Floating action bar for selection mode -->
    <Transition name="slide-up">
      <div
        v-if="selectionMode && selectedAthleteIds.size > 0"
        class="fixed bottom-0 left-0 right-0 bg-default border-t border-default shadow-xl z-40 px-4 py-3"
      >
        <div class="max-w-3xl mx-auto flex items-center justify-between">
          <span class="text-sm font-medium">
            {{ selectedAthleteIds.size }}/{{ MAX_GROUP_SIZE }} selected
          </span>
          <div class="flex gap-2">
            <UButton
              label="Cancel"
              variant="outline"
              color="neutral"
              size="sm"
              @click="cancelSelection"
            />
            <UButton
              label="Start Session"
              icon="i-lucide-play"
              size="sm"
              @click="startGroupSession"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
