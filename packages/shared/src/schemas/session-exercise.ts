import { z } from 'zod';
import { uuidSchema, nonNegativeInt } from './common.js';

export const addSessionExerciseInputSchema = z.object({
  exerciseId: uuidSchema,
  sortOrder: nonNegativeInt.optional(),
});
export type AddSessionExerciseInput = z.infer<typeof addSessionExerciseInputSchema>;

export const updateSessionExerciseInputSchema = z.object({
  sortOrder: nonNegativeInt.optional(),
  isSubstitution: z.boolean().optional(),
  substitutionReason: z.string().max(500).optional(),
  exerciseId: uuidSchema.optional(),
  notes: z.string().max(1000).nullish(),
});
export type UpdateSessionExerciseInput = z.infer<typeof updateSessionExerciseInputSchema>;
