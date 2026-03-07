<template>
  <UMain class="min-h-screen flex items-center justify-center">
    <div class="w-full max-w-md px-4">
      <div class="flex justify-center mb-8">
        <NuxtLink to="/">
          <AppLogo class="w-auto h-8" />
        </NuxtLink>
      </div>
      <slot />
    </div>
  </UMain>
</template>
