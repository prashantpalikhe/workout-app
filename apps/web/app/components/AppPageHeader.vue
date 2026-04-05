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
  <div class="hidden lg:flex items-start justify-between gap-4 mb-6">
    <div class="flex items-start gap-2 min-w-0">
      <UButton
        v-if="back"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        class="-ml-2 mt-0.5 shrink-0"
        :aria-label="`Back`"
        @click="onBack"
      />
      <div class="min-w-0">
        <h1 class="text-2xl font-bold truncate">
          {{ title }}
        </h1>
        <p v-if="description" class="text-sm text-muted mt-1">
          {{ description }}
        </p>
      </div>
    </div>
    <div v-if="$slots.links" class="flex items-center gap-2 shrink-0">
      <slot name="links" />
    </div>
  </div>

  <!-- Mobile: teleport actions into the sticky header (title is set via useState) -->
  <ClientOnly>
    <Teleport v-if="$slots.links" to="#mobile-header-actions" defer>
      <slot name="links" />
    </Teleport>
  </ClientOnly>
</template>
