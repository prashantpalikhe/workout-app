import { z } from 'zod';

// ── Reusable primitives ──────────────────────

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().trim().toLowerCase().email().max(255);

export const positiveFloat = z.number().positive();

export const nonNegativeFloat = z.number().nonnegative();

export const positiveInt = z.number().int().positive();

export const nonNegativeInt = z.number().int().nonnegative();

/** RPE (Rate of Perceived Exertion): 1–10 scale */
export const rpeSchema = z.number().min(1).max(10);

/** Tempo string: "eccentric-isometric-concentric-pause", e.g. "3-1-2-0" */
export const tempoStringSchema = z
  .string()
  .regex(/^\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}$/, 'Tempo must be "X-X-X-X" (e.g., "3-1-2-0")');

/** Rep range: "N" or "N-N", e.g. "5" or "8-12" */
export const repRangeSchema = z
  .string()
  .regex(/^\d{1,3}(-\d{1,3})?$/, 'Rep range must be "N" or "N-N" (e.g., "8-12")');

/** Date string in ISO format (YYYY-MM-DD) */
export const dateStringSchema = z.string().date();

// ── Pagination ───────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;
