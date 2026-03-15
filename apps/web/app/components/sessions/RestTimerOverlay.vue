<script setup lang="ts">
const props = defineProps<{
  isRunning: boolean
  isCompleted: boolean
  remaining: number
  total: number
  progress: number
  formattedTime: string
}>()

const emit = defineEmits<{
  skip: []
  'add-time': [seconds: number]
  'set-duration': [seconds: number]
}>()

const visible = computed(() => props.isRunning || props.isCompleted)

// ── Edit mode for tapping the time ──────────────
const editing = ref(false)
const editMinutes = ref(0)
const editSeconds = ref(0)

function startEdit() {
  if (props.isCompleted) return
  const totalSec = props.total
  editMinutes.value = Math.floor(totalSec / 60)
  editSeconds.value = totalSec % 60
  editing.value = true
}

function confirmEdit() {
  const newTotal = editMinutes.value * 60 + editSeconds.value
  if (newTotal > 0) {
    emit('set-duration', newTotal)
  }
  editing.value = false
}

function cancelEdit() {
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

// SVG progress ring
const radius = 22
const circumference = 2 * Math.PI * radius
const strokeDashoffset = computed(() => circumference * (1 - props.progress))
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
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
    >
      <div
        class="rounded-xl shadow-xl border border-default px-3 py-2 flex items-center gap-3"
        :class="isCompleted ? 'bg-success/10 animate-pulse' : 'bg-default'"
      >
        <!-- Progress Ring -->
        <div class="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52" class="-rotate-90">
            <!-- Background circle -->
            <circle
              cx="26" cy="26" :r="radius"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              class="text-muted/20"
            />
            <!-- Progress circle -->
            <circle
              cx="26" cy="26" :r="radius"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="strokeDashoffset"
              class="transition-[stroke-dashoffset] duration-1000 linear"
              :class="isCompleted ? 'text-success' : 'text-primary'"
            />
          </svg>
          <!-- Time display (clickable to edit) -->
          <button
            class="absolute inset-0 flex items-center justify-center"
            :class="isCompleted ? '' : 'cursor-pointer hover:opacity-70'"
            @click="startEdit"
          >
            <UIcon v-if="isCompleted" name="i-lucide-check" class="size-5 text-success" />
            <span v-else class="text-sm font-bold tabular-nums">{{ formattedTime }}</span>
          </button>
        </div>

        <!-- Label -->
        <p class="text-sm font-medium flex-1 min-w-0">
          {{ isCompleted ? 'Rest complete!' : 'Resting...' }}
        </p>

        <!-- Actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <UButton
            v-if="!isCompleted"
            label="-15s"
            size="xs"
            color="neutral"
            variant="soft"
            @click="emit('add-time', -15)"
          />
          <UButton
            v-if="!isCompleted"
            label="+15s"
            size="xs"
            color="neutral"
            variant="soft"
            @click="emit('add-time', 15)"
          />
          <UButton
            :label="isCompleted ? 'Dismiss' : 'Skip'"
            size="xs"
            :color="isCompleted ? 'success' : 'neutral'"
            :variant="isCompleted ? 'soft' : 'outline'"
            @click="emit('skip')"
          />
        </div>
      </div>

      <!-- Edit Duration Modal -->
      <UModal v-model:open="editing" title="Set Rest Duration">
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
            <UButton label="Cancel" color="neutral" variant="outline" @click="cancelEdit" />
            <UButton label="Apply" @click="confirmEdit" />
          </div>
        </template>
      </UModal>
    </div>
  </Transition>
</template>
