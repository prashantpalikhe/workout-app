/**
 * Composable for rest timer countdown between sets.
 * Supports session-sticky duration override, audio beep, and vibration.
 *
 * State is global (singleton) so the timer persists across page navigations.
 */

export interface RestTimerContext {
  exerciseName: string
  setNumber: number
  totalSets: number
  weight: number | null
}

// ── Global singleton state ──────────────────────
const _isRunning = ref(false)
const _isCompleted = ref(false)
const _remaining = ref(0)
const _total = ref(0)
const _sessionDefault = ref<number | null>(null)
const _context = ref<RestTimerContext | null>(null)

let _intervalId: ReturnType<typeof setInterval> | null = null
let _dismissTimeout: ReturnType<typeof setTimeout> | null = null

function _clearTimers() {
  if (_intervalId) {
    clearInterval(_intervalId)
    _intervalId = null
  }
  if (_dismissTimeout) {
    clearTimeout(_dismissTimeout)
    _dismissTimeout = null
  }
}

function _playBeep() {
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

function _vibrate() {
  try {
    navigator?.vibrate?.([200, 100, 200])
  } catch {
    // Vibration API not available
  }
}

function _onTick() {
  _remaining.value--
  if (_remaining.value <= 0) {
    _remaining.value = 0
    _isRunning.value = false
    _isCompleted.value = true
    _clearTimers()
    _playBeep()
    _vibrate()
    _dismissTimeout = setTimeout(() => {
      _isCompleted.value = false
    }, 3000)
  }
}

export function useRestTimer() {
  const progress = computed(() =>
    _total.value > 0 ? 1 - _remaining.value / _total.value : 0
  )

  const formattedTime = computed(() => {
    const mins = Math.floor(_remaining.value / 60)
    const secs = _remaining.value % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  })

  function start(seconds: number, context?: RestTimerContext) {
    _clearTimers()
    _total.value = seconds
    _remaining.value = seconds
    _isRunning.value = true
    _isCompleted.value = false
    if (context) _context.value = context
    _intervalId = setInterval(_onTick, 1000)
  }

  function skip() {
    _clearTimers()
    _isRunning.value = false
    _isCompleted.value = false
    _remaining.value = 0
  }

  function addTime(seconds: number) {
    if (!_isRunning.value && !_isCompleted.value) return
    if (_isCompleted.value) {
      _isCompleted.value = false
      _remaining.value = seconds
      _total.value = seconds
      _isRunning.value = true
      _intervalId = setInterval(_onTick, 1000)
      return
    }
    _remaining.value = Math.max(1, _remaining.value + seconds)
    _total.value = Math.max(1, _total.value + seconds)
  }

  function setDuration(seconds: number) {
    _sessionDefault.value = seconds
  }

  function reset() {
    _clearTimers()
    _isRunning.value = false
    _isCompleted.value = false
    _remaining.value = 0
    _total.value = 0
    _sessionDefault.value = null
    _context.value = null
  }

  return {
    isRunning: _isRunning,
    isCompleted: _isCompleted,
    remaining: _remaining,
    total: _total,
    progress,
    formattedTime,
    sessionDefault: _sessionDefault,
    context: _context,
    start,
    skip,
    addTime,
    setDuration,
    reset
  }
}
