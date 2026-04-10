const LB_PER_KG = 2.20462;
const IN_PER_CM = 0.393701;
const IN_PER_FT = 12;

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG * 100) / 100;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 100) / 100;
}

export function cmToIn(cm: number): number {
  return Math.round(cm * IN_PER_CM * 100) / 100;
}

export function inToCm(inches: number): number {
  return Math.round((inches / IN_PER_CM) * 100) / 100;
}

/**
 * Convert cm to whole feet + inches, rounding inches to the nearest whole number.
 * Handles the 12-inch rollover (e.g. 181 cm → 5'11", not 5'12").
 */
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = Math.round(cm * IN_PER_CM);
  const ft = Math.floor(totalInches / IN_PER_FT);
  const inches = totalInches - ft * IN_PER_FT;
  return { ft, inches };
}

/** Convert whole feet + inches back to cm, rounded to 2 decimals. */
export function ftInToCm(ft: number, inches: number): number {
  const totalInches = ft * IN_PER_FT + inches;
  return Math.round((totalInches / IN_PER_CM) * 100) / 100;
}
