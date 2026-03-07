/**
 * Estimate one-rep max using the Epley formula.
 * 1RM = weight × (1 + reps / 30)
 *
 * Returns the weight itself when reps === 1.
 * Accurate for rep ranges of 1–10; less accurate above 10.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) {
    throw new Error('Weight and reps must be positive');
  }
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}
