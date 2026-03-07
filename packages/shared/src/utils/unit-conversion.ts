const LB_PER_KG = 2.20462;
const IN_PER_CM = 0.393701;

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
