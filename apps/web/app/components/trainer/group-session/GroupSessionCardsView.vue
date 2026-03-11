<script setup lang="ts">
</script>

<template>
  <div class="group-session-grid">
    <slot />
  </div>
</template>

<style scoped>
.group-session-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .group-session-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .group-session-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
