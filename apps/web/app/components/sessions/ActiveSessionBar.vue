<script setup lang="ts">
const sessionStore = useSessionStore()
const route = useRoute()
const restTimer = useRestTimer()

const session = computed(() => sessionStore.activeSession)
const isOnActivePage = computed(() => route.path === '/sessions/active')
const isResting = computed(() => restTimer.isRunning.value || restTimer.isCompleted.value)

const visible = computed(() => {
  if (!session.value) return false
  if (isResting.value) return true
  return !isOnActivePage.value
})

// SVG progress ring
const radius = 20
const circumference = 2 * Math.PI * radius
const strokeDashoffset = computed(() => circumference * (1 - restTimer.progress.value))

// Edit rest duration
const editing = ref(false)
const editMinutes = ref(0)
const editSeconds = ref(0)

function startEdit() {
  if (restTimer.isCompleted.value) return
  const totalSec = restTimer.total.value
  editMinutes.value = Math.floor(totalSec / 60)
  editSeconds.value = totalSec % 60
  editing.value = true
}

function confirmEdit() {
  const newTotal = editMinutes.value * 60 + editSeconds.value
  if (newTotal > 0) {
    restTimer.setDuration(newTotal)
    restTimer.start(newTotal)
  }
  editing.value = false
}

const minuteOptions = Array.from({ length: 11 }, (_, i) => ({
  label: `${i}`,
  value: i
}))

const secondOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5
}))

const displayTime = computed(() => {
  const r = restTimer.remaining.value
  if (r >= 60) return restTimer.formattedTime.value
  return String(r)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="visible"
      class="fixed bottom-4 left-3 right-3 lg:left-auto lg:right-6 lg:bottom-6 lg:w-96 z-50"
    >
      <NuxtLink
        :to="isOnActivePage ? undefined : '/sessions/active'"
        class="block rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl bg-elevated border border-white/[0.08]"
      >
        <!-- Rest timer state -->
        <div
          v-if="isResting"
          class="flex items-center gap-3 px-3 py-2.5"
        >
          <!-- Progress ring -->
          <button
            class="relative shrink-0 size-12"
            :class="restTimer.isCompleted.value ? '' : 'cursor-pointer hover:opacity-70'"
            @click.prevent="startEdit"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              class="-rotate-90"
            >
              <circle
                cx="24"
                cy="24"
                :r="radius"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                class="text-white/10"
              />
              <circle
                cx="24"
                cy="24"
                :r="radius"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
                class="transition-[stroke-dashoffset] duration-1000 linear"
                :class="restTimer.isCompleted.value ? 'text-success' : 'text-primary'"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center">
              <UIcon
                v-if="restTimer.isCompleted.value"
                name="i-lucide-check"
                class="size-5 text-success"
              />
              <span
                v-else
                class="text-sm font-bold tabular-nums leading-none"
              >
                {{ displayTime }}
              </span>
            </span>
          </button>

          <!-- Session name -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">
              {{ session?.name || 'Workout' }}
            </p>
            <p class="text-xs text-muted">
              Rest
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5 shrink-0">
            <UButton
              v-if="!restTimer.isCompleted.value"
              label="-15s"
              size="md"
              color="neutral"
              variant="outline"
              @click.prevent="restTimer.addTime(-15)"
            />
            <UButton
              v-if="!restTimer.isCompleted.value"
              label="+15s"
              size="md"
              color="neutral"
              variant="outline"
              @click.prevent="restTimer.addTime(15)"
            />
            <UButton
              :label="restTimer.isCompleted.value ? 'Done' : 'Skip'"
              :icon="restTimer.isCompleted.value ? 'i-lucide-check' : 'i-lucide-skip-forward'"
              size="md"
              :color="restTimer.isCompleted.value ? 'success' : 'primary'"
              @click.prevent="restTimer.skip()"
            />
          </div>
        </div>

        <!-- Idle active session state (not resting) -->
        <div
          v-else
          class="flex items-center gap-3 px-3 py-2.5"
        >
          <div class="shrink-0 size-8 rounded-full bg-primary/20 flex items-center justify-center">
            <UIcon
              name="i-lucide-play"
              class="size-4 text-primary"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">
              {{ session?.name || 'Workout' }}
            </p>
            <SessionsSessionTimer
              v-if="session"
              :started-at="session.startedAt"
              class="!text-muted !text-xs"
            />
          </div>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 text-muted shrink-0"
          />
        </div>
      </NuxtLink>

      <!-- Edit Duration Modal -->
      <UModal
        v-model:open="editing"
        title="Set Rest Duration"
      >
        <template #body>
          <div class="flex items-center justify-center gap-2">
            <USelect
              v-model.number="editMinutes"
              :items="minuteOptions"
              value-key="value"
              class="w-20"
            />
            <span class="text-sm text-muted">min</span>
            <USelect
              v-model.number="editSeconds"
              :items="secondOptions"
              value-key="value"
              class="w-20"
            />
            <span class="text-sm text-muted">sec</span>
          </div>
          <p class="text-xs text-muted text-center mt-3">
            This will apply to all remaining sets in this session.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="editing = false"
            />
            <UButton
              label="Apply"
              @click="confirmEdit"
            />
          </div>
        </template>
      </UModal>
    </div>
  </Transition>
</template>
