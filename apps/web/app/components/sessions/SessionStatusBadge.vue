<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const badgeColor = computed(() => {
  switch (props.status) {
    case 'IN_PROGRESS': return 'info' as const
    case 'COMPLETED': return 'success' as const
    case 'ABANDONED': return 'error' as const
    default: return 'neutral' as const
  }
})

const badgeLabel = computed(() => {
  switch (props.status) {
    case 'IN_PROGRESS': return 'In Progress'
    case 'COMPLETED': return 'Completed'
    case 'ABANDONED': return 'Abandoned'
    default: return props.status
  }
})
</script>

<template>
  <UBadge :color="badgeColor" variant="subtle" size="xs">
    {{ badgeLabel }}
  </UBadge>
</template>
