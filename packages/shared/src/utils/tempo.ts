export interface Tempo {
  eccentric: number;
  isometric: number;
  concentric: number;
  pause: number;
}

/**
 * Parse a tempo string like "3-1-2-0" into its four phases.
 * Format: eccentric-isometric-concentric-pause
 */
export function parseTempoString(tempo: string): Tempo {
  const parts = tempo.split('-').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(`Invalid tempo string: "${tempo}". Expected format: "3-1-2-0"`);
  }
  return {
    eccentric: parts[0]!,
    isometric: parts[1]!,
    concentric: parts[2]!,
    pause: parts[3]!,
  };
}

/**
 * Format a Tempo object back into "3-1-2-0" string format.
 */
export function formatTempo(tempo: Tempo): string {
  return `${tempo.eccentric}-${tempo.isometric}-${tempo.concentric}-${tempo.pause}`;
}

/**
 * Calculate total time-under-tension for one rep at a given tempo.
 */
export function tempoTUT(tempo: Tempo): number {
  return tempo.eccentric + tempo.isometric + tempo.concentric + tempo.pause;
}
