<script setup lang="ts">
defineProps<{
  slotCount: number
  earliestStartedAt: string | null
}>()

const emit = defineEmits<{
  'end-all-complete': []
  'end-all-abandon': []
}>()

const dropdownItems = computed(() => [
  [
    {
      label: 'Complete All',
      icon: 'i-lucide-check-circle',
      onSelect: () => emit('end-all-complete')
    },
    {
      label: 'Abandon All',
      icon: 'i-lucide-x-circle',
      color: 'error' as const,
      onSelect: () => emit('end-all-abandon')
    }
  ]
])
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-semibold">
            Group Session
          </h1>
          <UBadge
            :label="`${slotCount} athlete${slotCount !== 1 ? 's' : ''}`"
            variant="subtle"
            size="xs"
          />
        </div>
        <p v-if="earliestStartedAt" class="text-sm text-muted">
          <SessionsSessionTimer :started-at="earliestStartedAt" />
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        label="Back"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        to="/trainer/athletes"
      />
      <UDropdownMenu :items="dropdownItems">
        <UButton
          label="End All"
          icon="i-lucide-square"
          size="sm"
          color="neutral"
          variant="outline"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
