<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { api } = useApiClient()
const toast = useToast()
const colorMode = useColorMode()
const authStore = useAuthStore()
const { refresh: refreshUserSettings } = useUserSettings()

interface UserSettings {
  restTimerEnabled: boolean
  defaultRestSec: number
  theme: string
}

const loading = ref(true)
const savedToastId = ref<string | number | undefined>()
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
  { label: 'Dark', value: 'DARK', icon: 'i-lucide-moon' }
]

const unitPreference = ref('METRIC')
const unitOptions = [
  { label: 'Metric (kg, cm)', value: 'METRIC' },
  { label: 'Imperial (lbs, in)', value: 'IMPERIAL' }
]

// ── Trainer Mode ─────────────────────────────────
const trainerMode = ref(!!authStore.user?.isTrainer)
const trainerToggleLoading = ref(false)
const showDisableConfirm = ref(false)

async function toggleTrainerMode(value: boolean) {
  if (!value) {
    // Show confirmation before disabling
    showDisableConfirm.value = true
    return
  }
  await saveTrainerMode(true)
}

async function confirmDisableTrainer() {
  showDisableConfirm.value = false
  await saveTrainerMode(false)
}

function cancelDisableTrainer() {
  showDisableConfirm.value = false
  // Revert the toggle
  trainerMode.value = true
}

async function saveTrainerMode(isTrainer: boolean) {
  trainerToggleLoading.value = true
  try {
    await api('/users/me', {
      method: 'PATCH',
      body: { isTrainer }
    })
    trainerMode.value = isTrainer
    // Refresh JWT tokens so the isTrainer claim is up to date
    await authStore.refreshSession()
    toast.add({
      title: isTrainer ? 'Trainer mode enabled' : 'Trainer mode disabled',
      color: 'success'
    })
  } catch {
    // Revert on failure
    trainerMode.value = !isTrainer
    toast.add({ title: 'Failed to update trainer mode', color: 'error' })
  } finally {
    trainerToggleLoading.value = false
  }
}

// ── Fetch settings ──────────────────────────────
onMounted(async () => {
  try {
    const [settings, profile] = await Promise.all([
      api<UserSettings>('/users/me/settings'),
      api<{ unitPreference: string }>('/users/me/profile')
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

function showSavedToast() {
  if (savedToastId.value) {
    toast.remove(savedToastId.value)
  }
  const t = toast.add({ title: 'Settings saved', color: 'success' })
  savedToastId.value = t.id
}

async function saveSettings() {
  try {
    const defaultRestSec = restMinutes.value * 60 + restSeconds.value
    await api('/users/me/settings', {
      method: 'PATCH',
      body: {
        restTimerEnabled: restTimerEnabled.value,
        defaultRestSec,
        theme: theme.value
      }
    })
    showSavedToast()
    // Refresh the global settings cache so other pages (e.g. active workout) see updated values
    await refreshUserSettings()
  } catch {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  }
}

async function saveUnitPreference() {
  try {
    await api('/users/me/profile', {
      method: 'PATCH',
      body: { unitPreference: unitPreference.value }
    })
    showSavedToast()
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
  value: i
}))

const secondOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5
}))
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6">
    <AppPageHeader
      title="Settings"
      description="Configure your workout preferences"
    />

    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <div v-else class="space-y-6">
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

      <!-- Trainer Mode -->
      <UCard>
        <div class="space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Trainer Mode</p>
              <p class="text-sm text-muted">
                Manage athletes and log workouts on their behalf
              </p>
            </div>
            <USwitch
              :model-value="trainerMode"
              :loading="trainerToggleLoading"
              @update:model-value="toggleTrainerMode"
            />
          </div>
        </div>
      </UCard>

      <!-- Disable Trainer Mode Confirmation -->
      <UModal v-model:open="showDisableConfirm">
        <template #content>
          <div class="p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div
                class="size-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0"
              >
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="size-5 text-warning"
                />
              </div>
              <div>
                <p class="font-semibold">Disable Trainer Mode?</p>
                <p class="text-sm text-muted mt-1">
                  All your active athlete relationships will be deactivated. You
                  can re-enable trainer mode later to reactivate them.
                </p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                @click="cancelDisableTrainer"
              />
              <UButton
                label="Disable"
                color="error"
                :loading="trainerToggleLoading"
                @click="confirmDisableTrainer"
              />
            </div>
          </div>
        </template>
      </UModal>

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
              This can be overridden per-exercise in programs or adjusted during
              a session.
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
