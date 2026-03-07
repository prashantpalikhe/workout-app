<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { api } = useApiClient()
const toast = useToast()
const colorMode = useColorMode()

interface UserSettings {
  restTimerEnabled: boolean
  defaultRestSec: number
  theme: string
}

const loading = ref(true)
const restTimerEnabled = ref(true)
const restMinutes = ref(1)
const restSeconds = ref(30)

// Initialize theme from the current client-side color mode (source of truth)
function colorModeToTheme(pref: string): string {
  if (pref === 'light') return 'LIGHT'
  if (pref === 'dark') return 'DARK'
  return 'SYSTEM'
}
const theme = ref(colorModeToTheme(colorMode.preference))

const themeOptions = [
  { label: 'System', value: 'SYSTEM', icon: 'i-lucide-monitor' },
  { label: 'Light', value: 'LIGHT', icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'DARK', icon: 'i-lucide-moon' },
]

const unitPreference = ref('METRIC')
const unitOptions = [
  { label: 'Metric (kg, cm)', value: 'METRIC' },
  { label: 'Imperial (lbs, in)', value: 'IMPERIAL' },
]

// ── Fetch settings ──────────────────────────────
onMounted(async () => {
  try {
    const [settings, profile] = await Promise.all([
      api<UserSettings>('/users/me/settings'),
      api<{ unitPreference: string }>('/users/me/profile'),
    ])

    restTimerEnabled.value = settings.restTimerEnabled
    const totalSec = settings.defaultRestSec
    restMinutes.value = Math.floor(totalSec / 60)
    restSeconds.value = totalSec % 60
    // theme is initialized from colorMode.preference (client-side truth)
    // Don't overwrite it from the backend to avoid resetting the user's preference
    unitPreference.value = profile.unitPreference || 'METRIC'
  } catch {
    // Use defaults
  } finally {
    loading.value = false
  }
})

function applyTheme(val: string) {
  switch (val) {
    case 'LIGHT':
      colorMode.preference = 'light'
      break
    case 'DARK':
      colorMode.preference = 'dark'
      break
    default:
      colorMode.preference = 'system'
  }
}

// ── Save settings (debounced) ───────────────────
let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave() {
  if (loading.value) return
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveSettings, 600)
}

async function saveSettings() {
  try {
    const defaultRestSec = restMinutes.value * 60 + restSeconds.value
    await api('/users/me/settings', {
      method: 'PATCH',
      body: {
        restTimerEnabled: restTimerEnabled.value,
        defaultRestSec,
        theme: theme.value,
      },
    })
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  }
}

async function saveUnitPreference() {
  try {
    await api('/users/me/profile', {
      method: 'PATCH',
      body: { unitPreference: unitPreference.value },
    })
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  }
}

function onThemeChange(val: string) {
  theme.value = val
  applyTheme(val)
  debouncedSave()
}

watch([restTimerEnabled, restMinutes, restSeconds], debouncedSave)

watch(unitPreference, () => {
  if (!loading.value) saveUnitPreference()
})

// ── Minute/second options ───────────────────────
const minuteOptions = Array.from({ length: 11 }, (_, i) => ({
  label: `${i}`,
  value: i,
}))

const secondOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5,
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
      <!-- Appearance -->
      <UCard>
        <div class="space-y-5">
          <div>
            <p class="font-medium">Appearance</p>
            <p class="text-sm text-muted">Choose your preferred theme</p>
          </div>
          <div class="flex gap-2">
            <UButton
              v-for="opt in themeOptions"
              :key="opt.value"
              :icon="opt.icon"
              :label="opt.label"
              :variant="theme === opt.value ? 'solid' : 'outline'"
              :color="theme === opt.value ? 'primary' : 'neutral'"
              size="sm"
              @click="onThemeChange(opt.value)"
            />
          </div>
        </div>
      </UCard>

      <!-- Units -->
      <UCard>
        <div class="space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Units</p>
              <p class="text-sm text-muted">Weight and measurement units</p>
            </div>
            <USelect
              v-model="unitPreference"
              :items="unitOptions"
              value-key="value"
              class="w-48"
            />
          </div>
        </div>
      </UCard>

      <!-- Rest Timer -->
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
