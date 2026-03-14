import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common.js';
import { PERSONAL_RECORD_TYPES } from '../constants/record.js';

// ── Filters ──────────────────────────────────────

export const personalRecordFilterSchema = paginationSchema.extend({
  exerciseId: uuidSchema.optional(),
  prType: z.enum(PERSONAL_RECORD_TYPES as [string, ...string[]]).optional(),
});
export type PersonalRecordFilter = z.infer<typeof personalRecordFilterSchema>;

export const checkPRInputSchema = z.object({
  exerciseId: uuidSchema,
  weight: z.number().positive().optional(),
  reps: z.number().int().positive().optional(),
  durationSec: z.number().int().positive().optional(),
  distance: z.number().positive().optional(),
});
export type CheckPRInput = z.infer<typeof checkPRInputSchema>;

export const EXERCISE_STATS_RANGES = ['12w', '1y', 'all'] as const;

export const exerciseStatsFilterSchema = z.object({
  range: z.enum(EXERCISE_STATS_RANGES).default('12w'),
});
export type ExerciseStatsFilter = z.infer<typeof exerciseStatsFilterSchema>;

export const exerciseHistoryFilterSchema = paginationSchema;
export type ExerciseHistoryFilter = z.infer<typeof exerciseHistoryFilterSchema>;

// ── Response interfaces ──────────────────────────

export interface ExerciseStatsDataPoint {
  date: string;
  maxWeight: number | null;
  estimated1RM: number | null;
  totalVolume: number | null;
  maxReps: number | null;
}

export interface ExerciseStatsResponse {
  exerciseId: string;
  range: string;
  dataPoints: ExerciseStatsDataPoint[];
}

export interface ExerciseHistorySet {
  id: string;
  setNumber: number;
  setType: string;
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  distance: number | null;
  rpe: number | null;
  completed: boolean;
  personalRecord: { id: string; prType: string; value: number } | null;
}

export interface ExerciseHistorySession {
  sessionId: string;
  sessionName: string;
  date: string;
  sets: ExerciseHistorySet[];
}

export interface ExerciseHistoryResponse {
  data: ExerciseHistorySession[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
