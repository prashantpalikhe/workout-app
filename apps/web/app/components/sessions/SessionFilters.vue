<script setup lang="ts">
const sessionStore = useSessionStore()
const { formatEnum } = useFormatEnum()

const searchQuery = ref(sessionStore.filters.search)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    sessionStore.filters.search = val
    sessionStore.filters.page = 1
    sessionStore.fetchSessions()
  }, 300)
})

const statusItems = [
  { label: formatEnum('COMPLETED'), value: 'COMPLETED' },
  { label: formatEnum('ABANDONED'), value: 'ABANDONED' },
]

const selectedStatus = ref(sessionStore.filters.status || '')

function onStatusChange(val: string) {
  selectedStatus.value = val
  sessionStore.filters.status = val || undefined
  sessionStore.filters.page = 1
  sessionStore.fetchSessions()
}

function clearFilters() {
  searchQuery.value = ''
  selectedStatus.value = ''
  sessionStore.resetFilters()
}
</script>

<template>
  <div class="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
    <UInput
      v-model="searchQuery"
      placeholder="Search sessions..."
      icon="i-lucide-search"
      class="flex-1 min-w-48"
    />

    <USelect
      :model-value="selectedStatus"
      :items="statusItems"
      placeholder="All Statuses"
      class="w-full sm:w-48"
      @update:model-value="onStatusChange"
    />

    <UButton
      v-if="sessionStore.hasActiveFilters"
      label="Clear"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      @click="clearFilters"
    />
  </div>
</template>
