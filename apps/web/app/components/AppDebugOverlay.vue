<script setup lang="ts">
/**
 * Debug overlay to troubleshoot scroll unresponsiveness.
 * Shows: RAF tick counter, active element, scroll containers info,
 * and time since last RAF (to detect main thread jams).
 *
 * Add <AppDebugOverlay /> to any page or layout to use.
 */

const visible = ref(true)
const rafCount = ref(0)
const lastRafTime = ref(0)
const rafDelta = ref(0)
const maxRafDelta = ref(0)
const activeElement = ref('')
const activeElementTag = ref('')
const scrollContainers = ref<{ selector: string; scrollTop: number; scrollHeight: number; clientHeight: number; overflowY: string }[]>([])
const longFrameLog = ref<{ time: string; delta: number }[]>([])
const visibilityState = ref('')
const timeSinceVisible = ref(0)
let visibleSince = 0

// Touch & scroll event tracking
const touchState = ref('idle') // idle, touching, scrolling
const lastTouchTime = ref('')
const touchEventLog = ref<{ time: string; event: string; target: string }[]>([])
const scrollEventLog = ref<{ time: string; target: string; scrollTop: number }[]>([])
const touchCount = ref({ start: 0, move: 0, end: 0, cancel: 0 })
const scrollCount = ref(0)
const pointerEvents = ref({ down: 0, move: 0, up: 0, cancel: 0 })

let rafId: number | null = null

function getActiveElementInfo() {
  let el = document.activeElement
  if (!el) return { tag: 'none', desc: 'none' }

  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = el.className && typeof el.className === 'string'
    ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
    : ''

  return { tag: `${tag}${id}${cls}`, desc: `${tag}${id}` }
}

function findScrollContainers() {
  const containers: typeof scrollContainers.value = []

  // Check body and html
  const html = document.documentElement
  const body = document.body
  if (html.scrollHeight > html.clientHeight) {
    containers.push({
      selector: 'html',
      scrollTop: html.scrollTop,
      scrollHeight: html.scrollHeight,
      clientHeight: html.clientHeight,
      overflowY: getComputedStyle(html).overflowY
    })
  }
  if (body.scrollHeight > body.clientHeight) {
    containers.push({
      selector: 'body',
      scrollTop: body.scrollTop,
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
      overflowY: getComputedStyle(body).overflowY
    })
  }

  // Find all elements with overflow-y auto/scroll that are actually scrollable
  const all = document.querySelectorAll('*')
  for (const el of all) {
    const style = getComputedStyle(el)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      if (el.scrollHeight > el.clientHeight + 1) {
        const tag = el.tagName.toLowerCase()
        const id = el.id ? `#${el.id}` : ''
        const cls = el.className && typeof el.className === 'string'
          ? `.${el.className.split(' ').filter(Boolean).slice(0, 2).join('.')}`
          : ''
        containers.push({
          selector: `${tag}${id}${cls}`,
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          overflowY: style.overflowY
        })
      }
    }
  }

  return containers
}

function tick(time: number) {
  rafCount.value++

  if (lastRafTime.value > 0) {
    rafDelta.value = Math.round(time - lastRafTime.value)
    if (rafDelta.value > maxRafDelta.value) {
      maxRafDelta.value = rafDelta.value
    }
    // Log frames longer than 100ms (significant jank)
    if (rafDelta.value > 100) {
      longFrameLog.value.unshift({
        time: new Date().toLocaleTimeString(),
        delta: rafDelta.value
      })
      // Keep only last 20 entries
      if (longFrameLog.value.length > 20) {
        longFrameLog.value.pop()
      }
    }
  }

  lastRafTime.value = time

  // Update active element every 30 frames to avoid perf overhead
  if (rafCount.value % 30 === 0) {
    const info = getActiveElementInfo()
    activeElement.value = info.desc
    activeElementTag.value = info.tag
  }

  // Update scroll containers every 60 frames
  if (rafCount.value % 60 === 0) {
    scrollContainers.value = findScrollContainers()
  }

  // Update visibility state
  visibilityState.value = document.visibilityState
  if (document.visibilityState === 'visible' && visibleSince > 0) {
    timeSinceVisible.value = Math.round((performance.now() - visibleSince) / 1000)
  }

  rafId = requestAnimationFrame(tick)
}

function resetMaxDelta() {
  maxRafDelta.value = 0
  longFrameLog.value = []
}

function elLabel(el: EventTarget | null): string {
  if (!el || !(el instanceof Element)) return '?'
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = el.className && typeof el.className === 'string'
    ? `.${el.className.split(' ').filter(Boolean).slice(0, 1).join('.')}`
    : ''
  return `${tag}${id}${cls}`
}

function logTouch(eventName: string, e: TouchEvent | PointerEvent) {
  const target = elLabel(e.target)
  const time = new Date().toLocaleTimeString()
  touchEventLog.value.unshift({ time, event: eventName, target })
  if (touchEventLog.value.length > 15) touchEventLog.value.pop()
}

function resetTouchStats() {
  touchCount.value = { start: 0, move: 0, end: 0, cancel: 0 }
  pointerEvents.value = { down: 0, move: 0, up: 0, cancel: 0 }
  scrollCount.value = 0
  touchEventLog.value = []
  scrollEventLog.value = []
}

let cleanups: (() => void)[] = []

onMounted(() => {
  rafId = requestAnimationFrame(tick)

  // Track visibility changes
  const onVisChange = () => {
    if (document.visibilityState === 'visible') {
      visibleSince = performance.now()
      lastRafTime.value = 0
    }
  }
  document.addEventListener('visibilitychange', onVisChange)
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisChange))

  // Touch event listeners (capture phase to see everything)
  const onTouchStart = (e: TouchEvent) => {
    touchCount.value.start++
    touchState.value = 'touching'
    lastTouchTime.value = new Date().toLocaleTimeString()
    logTouch('touchstart', e)
  }
  const onTouchMove = (e: TouchEvent) => {
    touchCount.value.move++
    touchState.value = 'scrolling'
  }
  const onTouchEnd = (e: TouchEvent) => {
    touchCount.value.end++
    touchState.value = 'idle'
    logTouch('touchend', e)
  }
  const onTouchCancel = (e: TouchEvent) => {
    touchCount.value.cancel++
    touchState.value = 'cancelled'
    logTouch('touchcancel', e)
  }

  // Pointer events (iOS sometimes uses these instead)
  const onPointerDown = (e: PointerEvent) => { pointerEvents.value.down++ }
  const onPointerMove = (e: PointerEvent) => { pointerEvents.value.move++ }
  const onPointerUp = (e: PointerEvent) => { pointerEvents.value.up++ }
  const onPointerCancel = (e: PointerEvent) => {
    pointerEvents.value.cancel++
    logTouch('pointercancel', e)
  }

  // Scroll event (capture phase)
  const onScroll = (e: Event) => {
    scrollCount.value++
    const target = elLabel(e.target)
    const scrollTop = (e.target as Element)?.scrollTop ?? 0
    // Only log every 10th scroll event to avoid flooding
    if (scrollCount.value % 10 === 0) {
      scrollEventLog.value.unshift({
        time: new Date().toLocaleTimeString(),
        target,
        scrollTop: Math.round(scrollTop)
      })
      if (scrollEventLog.value.length > 10) scrollEventLog.value.pop()
    }
  }

  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
  document.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true })
  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true })
  document.addEventListener('pointerup', onPointerUp, { capture: true, passive: true })
  document.addEventListener('pointercancel', onPointerCancel, { capture: true, passive: true })
  document.addEventListener('scroll', onScroll, { capture: true, passive: true })

  cleanups.push(
    () => document.removeEventListener('touchstart', onTouchStart, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('touchmove', onTouchMove, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('touchend', onTouchEnd, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('touchcancel', onTouchCancel, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('pointermove', onPointerMove, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('pointerup', onPointerUp, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('pointercancel', onPointerCancel, { capture: true } as EventListenerOptions),
    () => document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions),
  )
})

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
  cleanups.forEach(fn => fn())
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      style="
        position: fixed;
        bottom: 80px;
        right: 8px;
        z-index: 99999;
        background: rgba(0, 0, 0, 0.85);
        color: #0f0;
        font-family: monospace;
        font-size: 10px;
        line-height: 1.4;
        padding: 8px;
        border-radius: 6px;
        max-width: 320px;
        max-height: 50vh;
        overflow-y: auto;
        pointer-events: auto;
        user-select: text;
        -webkit-user-select: text;
      "
    >
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <strong style="color: #ff0;">DEBUG OVERLAY</strong>
        <button style="color: #f00; background: none; border: none; font-size: 14px; cursor: pointer;" @click="visible = false">
          ✕
        </button>
      </div>

      <div>RAF ticks: <span style="color: #0ff;">{{ rafCount }}</span></div>
      <div>Frame delta: <span :style="{ color: rafDelta > 50 ? '#f00' : rafDelta > 16 ? '#ff0' : '#0f0' }">{{ rafDelta }}ms</span></div>
      <div>
        Max delta: <span :style="{ color: maxRafDelta > 100 ? '#f00' : '#ff0' }">{{ maxRafDelta }}ms</span>
        <button style="color: #888; background: none; border: none; font-size: 9px; cursor: pointer; margin-left: 4px;" @click="resetMaxDelta">
          [reset]
        </button>
      </div>
      <div>Visibility: <span style="color: #0ff;">{{ visibilityState }}</span></div>
      <div v-if="timeSinceVisible > 0">
        Visible for: <span style="color: #0ff;">{{ timeSinceVisible }}s</span>
      </div>

      <div style="margin-top: 4px; border-top: 1px solid #333; padding-top: 4px;">
        Active element: <span style="color: #ff0;">{{ activeElementTag }}</span>
      </div>

      <div style="margin-top: 4px; border-top: 1px solid #333; padding-top: 4px;">
        <strong style="color: #ff0;">Scroll containers ({{ scrollContainers.length }}):</strong>
        <div v-for="(sc, i) in scrollContainers" :key="i" style="margin-top: 2px; padding-left: 4px; border-left: 2px solid #333;">
          <div style="color: #0ff;">{{ sc.selector }}</div>
          <div>overflow-y: {{ sc.overflowY }} | top: {{ Math.round(sc.scrollTop) }} | height: {{ sc.scrollHeight }}/{{ sc.clientHeight }}</div>
        </div>
        <div v-if="scrollContainers.length === 0" style="color: #888;">
          (scanning...)
        </div>
      </div>

      <div style="margin-top: 4px; border-top: 1px solid #333; padding-top: 4px;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: #ff0;">Touch / Scroll</strong>
          <button style="color: #888; background: none; border: none; font-size: 9px; cursor: pointer;" @click="resetTouchStats">
            [reset]
          </button>
        </div>
        <div>
          State: <span :style="{ color: touchState === 'idle' ? '#888' : touchState === 'scrolling' ? '#0f0' : '#ff0' }">{{ touchState }}</span>
        </div>
        <div>Touch: start={{ touchCount.start }} move={{ touchCount.move }} end={{ touchCount.end }} cancel={{ touchCount.cancel }}</div>
        <div>Pointer: dn={{ pointerEvents.down }} mv={{ pointerEvents.move }} up={{ pointerEvents.up }} cancel={{ pointerEvents.cancel }}</div>
        <div>Scroll events: <span style="color: #0ff;">{{ scrollCount }}</span></div>
      </div>

      <div v-if="touchEventLog.length" style="margin-top: 4px; border-top: 1px solid #333; padding-top: 4px;">
        <strong style="color: #ff0;">Touch event log:</strong>
        <div v-for="(entry, i) in touchEventLog" :key="'t'+i">
          <span style="color: #888;">{{ entry.time }}</span> <span style="color: #0ff;">{{ entry.event }}</span> → {{ entry.target }}
        </div>
      </div>

      <div v-if="scrollEventLog.length" style="margin-top: 4px; border-top: 1px solid #333; padding-top: 4px;">
        <strong style="color: #ff0;">Scroll targets:</strong>
        <div v-for="(entry, i) in scrollEventLog" :key="'s'+i">
          <span style="color: #888;">{{ entry.time }}</span> {{ entry.target }} (top={{ entry.scrollTop }})
        </div>
      </div>

      <div v-if="longFrameLog.length" style="margin-top: 4px; border-top: 1px solid #333; padding-top: 4px;">
        <strong style="color: #f00;">Long frames (>100ms):</strong>
        <div v-for="(entry, i) in longFrameLog" :key="'f'+i">
          <span style="color: #888;">{{ entry.time }}</span> — <span style="color: #f00;">{{ entry.delta }}ms</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
