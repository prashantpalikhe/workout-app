<script setup lang="ts">
/**
 * Responsive page header.
 * - Desktop (≥lg): renders a UPageHeader inline, with `links` slot on the right.
 * - Mobile: promotes the title into the layout's sticky mobile header and
 *   teleports the `links` slot into #mobile-header-actions (see layouts/default.vue).
 *
 * Pass `back` with a fallback list path to show a back button: SPA history is
 * used when available (preserves scroll/filter state), otherwise the fallback.
 */
const props = defineProps<{
  title: string
  description?: string
  back?: string
}>()

useMobileHeaderTitle(() => props.title)

// Register mobile back target only when `back` is set.
if (props.back) {
  useMobileHeaderBack(props.back)
}

function onBack() {
  if (props.back) goBack(props.back)
}
</script>

<template>
  <!-- Desktop header (hidden on mobile) -->
  <div class="hidden lg:block">
    <UButton
      v-if="back"
      label="Back"
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      size="sm"
      class="-ml-2 mb-2"
      @click="onBack"
    />
    <UPageHeader
      :title="title"
      :description="description"
      class="border-none"
    >
      <template v-if="$slots.links" #links>
        <slot name="links" />
      </template>
    </UPageHeader>
  </div>

  <!-- Mobile: teleport actions into the sticky header (title is set via useState) -->
  <ClientOnly>
    <Teleport v-if="$slots.links" to="#mobile-header-actions" defer>
      <slot name="links" />
    </Teleport>
  </ClientOnly>
</template>
