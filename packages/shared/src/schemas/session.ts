import { z } from 'zod';
import { uuidSchema, rpeSchema } from './common.js';

export const startSessionInputSchema = z.object({
  programAssignmentId: uuidSchema.optional(),
  name: z.string().min(1).max(200).trim().optional(),
});
export type StartSessionInput = z.infer<typeof startSessionInputSchema>;

export const completeSessionInputSchema = z.object({
  overallRpe: rpeSchema.optional(),
  notes: z.string().max(1000).optional(),
});
export type CompleteSessionInput = z.infer<typeof completeSessionInputSchema>;

export const updateSessionInputSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  notes: z.string().max(1000).optional(),
  overallRpe: rpeSchema.optional(),
});
export type UpdateSessionInput = z.infer<typeof updateSessionInputSchema>;
