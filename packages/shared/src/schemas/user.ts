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
  weight: positiveFloat.nullable().optional(),
  height: positiveFloat.nullable().optional(),
  dateOfBirth: dateStringSchema.nullable().optional(),
  gender: z.enum(GENDERS as [string, ...string[]]).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  link: z.string().url().max(255).nullable().optional(),
});
export type AthleteProfileInput = z.infer<typeof athleteProfileInputSchema>;

export const userSettingsSchema = z.object({
  theme: z.enum(THEMES as [string, ...string[]]),
  unitPreference: z.enum(UNIT_PREFERENCES as [string, ...string[]]),
  restTimerEnabled: z.boolean(),
  defaultRestSec: z.number().int().min(0).max(600),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const userSettingsInputSchema = userSettingsSchema.partial();
export type UserSettingsInput = z.infer<typeof userSettingsInputSchema>;
