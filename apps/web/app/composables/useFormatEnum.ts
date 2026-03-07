export function useFormatEnum() {
  function formatEnum(value: string | null | undefined): string {
    if (!value) return ''
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  return { formatEnum }
}
