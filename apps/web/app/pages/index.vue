<script setup>
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})
</script>

<template>
  <div class="text-center">
    <h1 class="text-4xl font-bold mb-4">
      Workout App
    </h1>
    <p class="text-lg text-muted mb-8">
      Track your workouts. Crush your goals.
    </p>
    <div class="flex gap-3 justify-center">
      <UButton
        to="/login"
        label="Sign In"
        size="xl"
      />
      <UButton
        to="/register"
        label="Get Started"
        size="xl"
        color="neutral"
        variant="outline"
      />
    </div>
  </div>
</template>
