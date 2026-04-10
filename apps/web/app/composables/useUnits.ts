import {
  kgToLb,
  lbToKg,
  cmToFtIn,
  ftInToCm
} from '@workout/shared'

type UnitPreference = 'METRIC' | 'IMPERIAL'

const DEFAULT_PREFERENCE: UnitPreference = 'METRIC'

/**
 * Reactive unit formatting + parsing for the current user.
 *
 * All storage is metric — every `kg` and `cm` passed in must already be in
 * metric. The composable handles the display conversion and the reverse
 * conversion on input. Falls back to metric if the user isn't hydrated yet.
 */
export function useUnits() {
  const authStore = useAuthStore()

  const unitPreference = computed<UnitPreference>(
    () => (authStore.user?.settings?.unitPreference as UnitPreference | undefined) ?? DEFAULT_PREFERENCE
  )
  const isImperial = computed(() => unitPreference.value === 'IMPERIAL')
  const weightUnit = computed<'kg' | 'lbs'>(() => (isImperial.value ? 'lbs' : 'kg'))
  const heightUnit = computed<'cm' | 'ft/in'>(() => (isImperial.value ? 'ft/in' : 'cm'))

  /** "Weight (kg)" / "Weight (lbs)" — for table column headers. */
  const weightColumnLabel = computed(() => `Weight (${weightUnit.value})`)

  /**
   * Format a weight in kg for display. Metric keeps source precision,
   * imperial rounds to 1 decimal for readability (raw lbs values are ugly).
   * Null/undefined/zero returns a dash.
   */
  function formatWeight(kg: number | null | undefined): string {
    if (kg == null || kg === 0) return '-'
    if (isImperial.value) {
      const lbs = Math.round(kgToLb(kg) * 10) / 10
      return `${lbs} lbs`
    }
    const rounded = Math.round(kg * 10) / 10
    return `${rounded} kg`
  }

  /**
   * Convert a kg value to a display-unit number (no unit suffix).
   * Used for chart datasets and input field values.
   */
  function formatWeightValue(kg: number | null | undefined): number | null {
    if (kg == null) return null
    if (isImperial.value) return Math.round(kgToLb(kg) * 10) / 10
    return Math.round(kg * 10) / 10
  }

  /**
   * Format an aggregated volume (weight × reps × sets). Summed in kg upstream,
   * converted here once to avoid compounding rounding. Integer display with
   * thousands separators in both modes.
   */
  function formatVolume(kg: number | null | undefined): string {
    if (kg == null || kg === 0) return '-'
    const value = isImperial.value ? kgToLb(kg) : kg
    return `${Math.round(value).toLocaleString()} ${weightUnit.value}`
  }

  /** Format a height in cm. Imperial is feet + inches (e.g. "5' 11\""). */
  function formatHeight(cm: number | null | undefined): string {
    if (cm == null || cm === 0) return '-'
    if (isImperial.value) {
      const { ft, inches } = cmToFtIn(cm)
      return `${ft}' ${inches}"`
    }
    return `${Math.round(cm)} cm`
  }

  /**
   * Parse a user-typed weight in the current display unit back to kg for storage.
   * In metric mode this is identity. In imperial mode, the user typed lbs and we
   * convert to kg via the shared helper.
   */
  function parseWeightInput(value: number | null | undefined): number | null {
    if (value == null) return null
    if (isImperial.value) return lbToKg(value)
    return value
  }

  /**
   * Parse user-typed height (cm for metric, feet+inches for imperial) back to cm.
   * Accepts a single number for metric callers; imperial callers pass `{ ft, inches }`.
   */
  function parseHeightInput(value: number): number
  function parseHeightInput(value: { ft: number, inches: number }): number
  function parseHeightInput(value: number | { ft: number, inches: number }): number {
    if (typeof value === 'number') {
      if (isImperial.value) return ftInToCm(0, value)
      return value
    }
    return ftInToCm(value.ft, value.inches)
  }

  /** Convert a kg value to a display-unit tuple useful for splitting ft/in inputs. */
  function toDisplayHeight(cm: number | null | undefined): { ft: number, inches: number } | number | null {
    if (cm == null) return null
    if (isImperial.value) return cmToFtIn(cm)
    return Math.round(cm)
  }

  return {
    unitPreference,
    isImperial,
    weightUnit,
    heightUnit,
    weightColumnLabel,
    formatWeight,
    formatWeightValue,
    formatVolume,
    formatHeight,
    parseWeightInput,
    parseHeightInput,
    toDisplayHeight
  }
}
