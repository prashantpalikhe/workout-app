import { z } from 'zod';

/**
 * Zod schema that validates ALL environment variables at startup.
 *
 * If any variable is missing or invalid, the app crashes immediately
 * with a descriptive error — "fail-fast" prevents running with broken config.
 *
 * More env vars (JWT_SECRET, REDIS_URL, SENTRY_DSN, etc.) will be added
 * in their respective implementation steps.
 */
export const envSchema = z.object({
  // ── Server ────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3001),

  // ── Database ──────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── CORS ──────────────────────────────────────────
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // ── Auth / JWT ──────────────────────────────────
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;
