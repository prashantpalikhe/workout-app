import { z } from 'zod';
import { positiveInt, positiveFloat, rpeSchema, tempoStringSchema } from './common.js';
import { SESSION_SET_TYPES } from '../constants/session.js';

export const createSessionSetInputSchema = z.object({
  setNumber: positiveInt,
  setType: z.enum(SESSION_SET_TYPES as [string, ...string[]]).default('WORKING'),
  weight: positiveFloat.optional(),
  reps: positiveInt.optional(),
  durationSec: positiveInt.optional(),
  distance: positiveFloat.optional(),
  rpe: rpeSchema.optional(),
  tempo: tempoStringSchema.optional(),
  restSec: positiveInt.optional(),
  completed: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});
export type CreateSessionSetInput = z.infer<typeof createSessionSetInputSchema>;

export const updateSessionSetInputSchema = createSessionSetInputSchema.partial();
export type UpdateSessionSetInput = z.infer<typeof updateSessionSetInputSchema>;
