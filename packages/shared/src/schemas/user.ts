import { z } from 'zod';
import { positiveFloat, dateStringSchema } from './common.js';
import { UNIT_PREFERENCES, GENDERS, THEMES } from '../constants/user.js';

export const updateUserInputSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  avatarUrl: z.string().url().optional(),
  isTrainer: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const athleteProfileInputSchema = z.object({
  weight: positiveFloat.optional(),
  height: positiveFloat.optional(),
  dateOfBirth: dateStringSchema.optional(),
  unitPreference: z.enum(UNIT_PREFERENCES as [string, ...string[]]).optional(),
  gender: z.enum(GENDERS as [string, ...string[]]).optional(),
  bio: z.string().max(500).optional(),
  link: z.string().url().max(255).optional(),
});
export type AthleteProfileInput = z.infer<typeof athleteProfileInputSchema>;

export const userSettingsInputSchema = z.object({
  theme: z.enum(THEMES as [string, ...string[]]).optional(),
  restTimerEnabled: z.boolean().optional(),
  defaultRestSec: z.number().int().min(0).max(600).optional(),
});
export type UserSettingsInput = z.infer<typeof userSettingsInputSchema>;
