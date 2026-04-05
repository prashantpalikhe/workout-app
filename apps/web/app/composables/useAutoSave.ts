interface UseAutoSaveOptions {
  debounceMs?: number
  onError?: (error: unknown) => void
}

export function useAutoSave(
  saveFn: () => Promise<void>,
  options: UseAutoSaveOptions = {}
) {
  const { debounceMs = 400, onError } = options

  const saving = ref(false)
  const error = ref<string | null>(null)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function schedule() {
    if (timeoutId) clearTimeout(timeoutId)
    error.value = null
    timeoutId = setTimeout(async () => {
      saving.value = true
      try {
        await saveFn()
        error.value = null
      } catch (err: unknown) {
        const fetchError = err as { data?: { message?: string } }
        error.value = fetchError?.data?.message || 'Save failed'
        onError?.(err)
      } finally {
        saving.value = false
      }
    }, debounceMs)
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  function flush() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      saveFn().catch(() => {})
    }
  }

  onUnmounted(() => flush())

  return { saving, error, schedule, cancel, flush }
}
