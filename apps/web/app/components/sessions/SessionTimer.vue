<script setup lang="ts">
const props = defineProps<{
  startedAt: string
}>()

const elapsed = ref('00:00:00')

function formatElapsed() {
  const start = new Date(props.startedAt).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((now - start) / 1000))

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  elapsed.value = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':')
}

let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  formatElapsed()
  intervalId = setInterval(formatElapsed, 1000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <span class="font-mono text-sm text-muted tabular-nums">{{ elapsed }}</span>
</template>
