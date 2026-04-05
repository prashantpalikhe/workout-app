<script setup lang="ts">
/**
 * Responsive page header.
 * - Desktop (≥lg): renders a UPageHeader inline, with `links` slot on the right.
 * - Mobile: promotes the title into the layout's sticky mobile header and
 *   teleports the `links` slot into #mobile-header-actions (see layouts/default.vue).
 */
const props = defineProps<{
  title: string
  description?: string
}>()

useMobileHeaderTitle(() => props.title)
</script>

<template>
  <!-- Desktop header (hidden on mobile) -->
  <UPageHeader :title="title" :description="description" class="hidden lg:flex">
    <template v-if="$slots.links" #links>
      <slot name="links" />
    </template>
  </UPageHeader>

  <!-- Mobile: teleport actions into the sticky header (title is set via useState) -->
  <ClientOnly>
    <Teleport v-if="$slots.links" to="#mobile-header-actions" defer>
      <slot name="links" />
    </Teleport>
  </ClientOnly>
</template>
