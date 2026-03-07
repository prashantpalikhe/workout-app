<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { api } = useApiClient()
const toast = useToast()

interface UserSettings {
  restTimerEnabled: boolean
  defaultRestSec: number
  theme: string
}

const loading = ref(true)
const saving = ref(false)
const restTimerEnabled = ref(true)
const restMinutes = ref(1)
const restSeconds = ref(30)

// ── Fetch settings ──────────────────────────────
onMounted(async () => {
  try {
    const data = await api<UserSettings>('/users/me/settings')
    restTimerEnabled.value = data.restTimerEnabled
    const totalSec = data.defaultRestSec
    restMinutes.value = Math.floor(totalSec / 60)
    restSeconds.value = totalSec % 60
  } catch {
    // Use defaults
  } finally {
    loading.value = false
  }
})

// ── Save settings ───────────────────────────────
async function save() {
  saving.value = true
  try {
    const defaultRestSec = restMinutes.value * 60 + restSeconds.value
    await api('/users/me/settings', {
      method: 'PATCH',
      body: {
        restTimerEnabled: restTimerEnabled.value,
        defaultRestSec
      }
    })
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  } finally {
    saving.value = false
  }
}

// Auto-save on changes (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave() {
  if (loading.value) return
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(save, 600)
}

watch([restTimerEnabled, restMinutes, restSeconds], debouncedSave)

// ── Minute/second options ───────────────────────
const minuteOptions = Array.from({ length: 11 }, (_, i) => ({
  label: `${i}`,
  value: i
}))

const secondOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5
}))
</script>

<template>
  <div class="max-w-2xl mx-auto p-4 sm:p-6">
    <UPageHeader
      title="Settings"
      description="Configure your workout preferences"
    />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else class="mt-6 space-y-6">
      <!-- Rest Timer Section -->
      <UCard>
        <div class="space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Rest Timer</p>
              <p class="text-sm text-muted">
                Automatically start a countdown timer after completing a set
              </p>
            </div>
            <USwitch v-model="restTimerEnabled" />
          </div>

          <div v-if="restTimerEnabled" class="pt-2 border-t border-default">
            <p class="text-sm font-medium mb-3">Default Rest Duration</p>
            <div class="flex items-center gap-2">
              <USelect
                v-model.number="restMinutes"
                :items="minuteOptions"
                value-key="value"
                class="w-20"
              />
              <span class="text-sm text-muted">min</span>
              <USelect
                v-model.number="restSeconds"
                :items="secondOptions"
                value-key="value"
                class="w-20"
              />
              <span class="text-sm text-muted">sec</span>
            </div>
            <p class="text-xs text-muted mt-2">
              This can be overridden per-exercise in programs or adjusted during a session.
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
