import { z } from 'zod';
import { uuidSchema, emailSchema, dateStringSchema } from './common.js';
import { TRAINER_ATHLETE_STATUSES } from '../constants/trainer.js';

export const inviteAthleteInputSchema = z.object({
  email: emailSchema,
});
export type InviteAthleteInput = z.infer<typeof inviteAthleteInputSchema>;

export const createInviteLinkInputSchema = z.object({
  expiresInHours: z.number().int().min(1).max(720).default(168), // default 7 days
});
export type CreateInviteLinkInput = z.infer<typeof createInviteLinkInputSchema>;

export const acceptInviteInputSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteInputSchema>;

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

export const updateAssignmentInputSchema = z.object({
  startDate: dateStringSchema.optional(),
  allowSessionDeviations: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentInputSchema>;

export const trainerAthleteFilterSchema = z.object({
  status: z.enum(TRAINER_ATHLETE_STATUSES as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type TrainerAthleteFilter = z.infer<typeof trainerAthleteFilterSchema>;
