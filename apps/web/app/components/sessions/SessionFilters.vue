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
  { label: formatEnum('ABANDONED'), value: 'ABANDONED' }
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

const activeFilterCount = computed(() => (selectedStatus.value ? 1 : 0))
const filtersExpanded = ref(false)
</script>

<template>
  <div class="mb-6">
    <!-- Search row -->
    <div class="flex items-center gap-2">
      <UInput
        v-model="searchQuery"
        placeholder="Search sessions..."
        icon="i-lucide-search"
        class="flex-1"
      />
      <UButton
        :icon="filtersExpanded ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
        color="neutral"
        variant="outline"
        :aria-label="filtersExpanded ? 'Hide filters' : 'Show filters'"
        @click="filtersExpanded = !filtersExpanded"
      >
        <span
          v-if="activeFilterCount && !filtersExpanded"
          class="ml-1 inline-flex items-center justify-center size-5 rounded-full bg-primary text-inverted text-xs font-medium"
        >
          {{ activeFilterCount }}
        </span>
      </UButton>
    </div>

    <!-- Filters: collapsible on all sizes -->
    <div
      v-if="filtersExpanded"
      class="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-3"
    >
      <USelect
        :model-value="selectedStatus"
        :items="statusItems"
        placeholder="All Statuses"
        class="w-full sm:w-48"
        @update:model-value="onStatusChange"
      />

      <div v-if="sessionStore.hasActiveFilters" class="flex justify-end sm:block">
        <UButton
          label="Clear"
          icon="i-lucide-x"
          color="neutral"
          variant="subtle"
          @click="clearFilters"
        />
      </div>
    </div>
  </div>
</template>
