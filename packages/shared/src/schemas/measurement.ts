import { z } from 'zod';
import { positiveFloat, dateStringSchema } from './common.js';

export const createMeasurementInputSchema = z.object({
  measuredOn: dateStringSchema,
  bodyWeight: positiveFloat.optional(),
  chest: positiveFloat.optional(),
  waist: positiveFloat.optional(),
  hips: positiveFloat.optional(),
  leftArm: positiveFloat.optional(),
  rightArm: positiveFloat.optional(),
  leftThigh: positiveFloat.optional(),
  rightThigh: positiveFloat.optional(),
  leftCalf: positiveFloat.optional(),
  rightCalf: positiveFloat.optional(),
  neck: positiveFloat.optional(),
  shoulders: positiveFloat.optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateMeasurementInput = z.infer<typeof createMeasurementInputSchema>;

export const updateMeasurementInputSchema = createMeasurementInputSchema.partial();
export type UpdateMeasurementInput = z.infer<typeof updateMeasurementInputSchema>;
