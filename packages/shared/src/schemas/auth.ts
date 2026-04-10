import { z } from 'zod';
import { emailSchema } from './common.js';
import { userSettingsSchema } from './user.js';

export const registerInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
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

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  firstName: z.string(),
  lastName: z.string(),
  isTrainer: z.boolean(),
  avatarUrl: z.string().nullable().optional(),
  hasPassword: z.boolean().optional(),
  settings: userSettingsSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  user: authUserSchema,
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

// ── Password Reset Schemas ──────────────────

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// ── Authenticated Password Management ────────

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const setPasswordInputSchema = z.object({
  password: z.string().min(8).max(128),
});
export type SetPasswordInput = z.infer<typeof setPasswordInputSchema>;
