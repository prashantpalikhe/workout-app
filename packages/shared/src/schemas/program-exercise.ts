import { z } from 'zod';
import {
  uuidSchema,
  positiveInt,
  nonNegativeInt,
  rpeSchema,
  tempoStringSchema,
  repRangeSchema,
} from './common.js';

export const createProgramExerciseInputSchema = z.object({
  exerciseId: uuidSchema,
  sortOrder: nonNegativeInt.default(0),
  targetSets: positiveInt.optional(),
  targetReps: repRangeSchema.optional(),
  targetRpe: rpeSchema.optional(),
  targetTempo: tempoStringSchema.optional(),
  restSec: positiveInt.optional(),
  notes: z.string().max(500).optional(),
});
export type CreateProgramExerciseInput = z.infer<typeof createProgramExerciseInputSchema>;

export const updateProgramExerciseInputSchema = createProgramExerciseInputSchema
  .omit({ exerciseId: true })
  .partial();
export type UpdateProgramExerciseInput = z.infer<typeof updateProgramExerciseInputSchema>;

export const reorderInputSchema = z.array(
  z.object({
    id: uuidSchema,
    sortOrder: nonNegativeInt,
  }),
);
export type ReorderInput = z.infer<typeof reorderInputSchema>;
