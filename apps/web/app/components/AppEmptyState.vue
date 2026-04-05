<script setup lang="ts">
/**
 * Consistent empty state: icon, title, optional description, optional action slot.
 */
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <UIcon
      v-if="icon"
      :name="icon"
      class="size-12 text-muted mb-4"
    />
    <h3 class="text-lg font-medium mb-2">
      {{ title }}
    </h3>
    <p v-if="description" class="text-sm text-muted" :class="$slots.default ? 'mb-6' : ''">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
