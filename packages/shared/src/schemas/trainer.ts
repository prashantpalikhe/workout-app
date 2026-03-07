import { z } from 'zod';
import { uuidSchema, emailSchema, dateStringSchema } from './common.js';
import { TRAINER_ATHLETE_STATUSES } from '../constants/trainer.js';

export const inviteAthleteInputSchema = z.object({
  email: emailSchema,
});
export type InviteAthleteInput = z.infer<typeof inviteAthleteInputSchema>;

export const updateRelationshipInputSchema = z.object({
  status: z.enum(TRAINER_ATHLETE_STATUSES as [string, ...string[]]),
});
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipInputSchema>;

export const createAssignmentInputSchema = z.object({
  programId: uuidSchema,
  athleteId: uuidSchema,
  startDate: dateStringSchema.optional(),
  allowSessionDeviations: z.boolean().default(true),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;
