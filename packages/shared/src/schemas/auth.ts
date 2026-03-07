import { z } from 'zod';
import { emailSchema } from './common.js';
import { USER_ROLES } from '../constants/user.js';

export const registerInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  role: z.enum(USER_ROLES as [string, ...string[]]).default('ATHLETE'),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;
