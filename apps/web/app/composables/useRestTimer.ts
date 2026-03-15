/**
 * Composable for rest timer countdown between sets.
 * Supports session-sticky duration override, audio beep, and vibration.
 */
export function useRestTimer() {
  const isRunning = ref(false)
  const isCompleted = ref(false)
  const remaining = ref(0)
  const total = ref(0)
  /** Session-sticky override: if user edits the timer duration, it sticks for all remaining sets. */
  const sessionDefault = ref<number | null>(null)

  const progress = computed(() =>
    total.value > 0 ? 1 - remaining.value / total.value : 0
  )

  const formattedTime = computed(() => {
    const mins = Math.floor(remaining.value / 60)
    const secs = remaining.value % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  })

  let intervalId: ReturnType<typeof setInterval> | null = null
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (dismissTimeout) {
      clearTimeout(dismissTimeout)
      dismissTimeout = null
    }
  }

  function start(seconds: number) {
    clearTimers()
    total.value = seconds
    remaining.value = seconds
    isRunning.value = true
    isCompleted.value = false

    intervalId = setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) {
        remaining.value = 0
        isRunning.value = false
        isCompleted.value = true
        clearTimers()
        playBeep()
        vibrate()
        // Auto-dismiss after 3 seconds
        dismissTimeout = setTimeout(() => {
          isCompleted.value = false
        }, 3000)
      }
    }, 1000)
  }

  function skip() {
    clearTimers()
    isRunning.value = false
    isCompleted.value = false
    remaining.value = 0
  }

  function addTime(seconds: number) {
    if (!isRunning.value && !isCompleted.value) return
    if (isCompleted.value) {
      // Timer already finished — restart with added time
      isCompleted.value = false
      remaining.value = seconds
      total.value = seconds
      isRunning.value = true
      intervalId = setInterval(() => {
        remaining.value--
        if (remaining.value <= 0) {
          remaining.value = 0
          isRunning.value = false
          isCompleted.value = true
          clearTimers()
          playBeep()
          vibrate()
          dismissTimeout = setTimeout(() => {
            isCompleted.value = false
          }, 3000)
        }
      }, 1000)
      return
    }
    remaining.value = Math.max(1, remaining.value + seconds)
    total.value = Math.max(1, total.value + seconds)
  }

  /** Change the session-sticky default for all subsequent timers. */
  function setDuration(seconds: number) {
    sessionDefault.value = seconds
  }

  // ── Audio beep via Web Audio API ──────────────
  function playBeep() {
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gain.gain.value = 0.3

      oscillator.start()
      // Three short beeps
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.25)
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.4)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.5)
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.65)

      oscillator.stop(ctx.currentTime + 0.7)
      setTimeout(() => ctx.close(), 1000)
    } catch {
      // Web Audio API not available — silently fail
    }
  }

  function vibrate() {
    try {
      navigator?.vibrate?.([200, 100, 200])
    } catch {
      // Vibration API not available
    }
  }

  // Cleanup on scope dispose
  onScopeDispose(() => {
    clearTimers()
  })

  return {
    isRunning,
    isCompleted,
    remaining,
    total,
    progress,
    formattedTime,
    sessionDefault,
    start,
    skip,
    addTime,
    setDuration
  }
}
