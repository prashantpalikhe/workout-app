export interface RepRange {
  min: number;
  max: number;
}

/**
 * Parse a rep range string like "8-12" or "5" into min/max.
 */
export function parseRepRange(range: string): RepRange {
  const parts = range.split('-').map(Number);
  if (parts.length === 1 && !isNaN(parts[0]!)) {
    return { min: parts[0]!, max: parts[0]! };
  }
  if (parts.length === 2 && parts.every((p) => !isNaN(p))) {
    return { min: parts[0]!, max: parts[1]! };
  }
  throw new Error(`Invalid rep range: "${range}". Expected "N" or "N-N"`);
}

/**
 * Format a RepRange back into string form. Single number if min === max.
 */
export function formatRepRange(range: RepRange): string {
  return range.min === range.max ? `${range.min}` : `${range.min}-${range.max}`;
}
