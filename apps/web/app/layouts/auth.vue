<template>
  <UMain class="min-h-screen flex items-center justify-center bg-decorated">
    <div class="w-full max-w-md px-4">
      <slot />
    </div>
  </UMain>
</template>

<style scoped>
.bg-decorated {
  position: relative;
  overflow: clip;
}

.bg-decorated::before {
  content: '';
  position: absolute;
  inset: -24px;
  width: calc(100% + 48px);
  height: calc(100% + 48px);
  overflow: clip;
  background-image: url('~/assets/images/bg-decorated.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: blur(4px);
  z-index: -1;
}
</style>
