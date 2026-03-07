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

// ── Auth Response Schemas ─────────────────────

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: emailSchema,
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(USER_ROLES as [string, ...string[]]),
  }),
  tokens: authTokensSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const messageResponseSchema = z.object({
  message: z.string(),
});
export type MessageResponse = z.infer<typeof messageResponseSchema>;

// ── OAuth Input Schemas ──────────────────────

export const googleOAuthInputSchema = z.object({
  idToken: z.string().min(1),
});
export type GoogleOAuthInput = z.infer<typeof googleOAuthInputSchema>;

export const appleOAuthInputSchema = z.object({
  idToken: z.string().min(1),
  // Apple only sends the user's name on the FIRST authorization.
  // The frontend must capture and forward it so we can store it.
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
});
export type AppleOAuthInput = z.infer<typeof appleOAuthInputSchema>;
