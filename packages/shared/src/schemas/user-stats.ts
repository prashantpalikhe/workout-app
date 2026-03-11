import { z } from 'zod';

// ── Chart Stats Filter ──────────────────────
export const CHART_STATS_RANGES = ['12w', '1y', 'all'] as const;
export const CHART_STATS_METRICS = ['duration', 'reps'] as const;

export const chartStatsFilterSchema = z.object({
  range: z.enum(CHART_STATS_RANGES).default('12w'),
  metric: z.enum(CHART_STATS_METRICS).default('duration'),
});
export type ChartStatsFilter = z.infer<typeof chartStatsFilterSchema>;

// Keep old names as aliases for backward compat during transition
export const WEEKLY_STATS_RANGES = CHART_STATS_RANGES;
export const WEEKLY_STATS_METRICS = CHART_STATS_METRICS;
export const weeklyStatsFilterSchema = chartStatsFilterSchema;
export type WeeklyStatsFilter = ChartStatsFilter;

// ── Calendar Stats Filter ───────────────────
export const calendarStatsFilterSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});
export type CalendarStatsFilter = z.infer<typeof calendarStatsFilterSchema>;

// ── Response Types ──────────────────────────

export interface UserStatsResponse {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  totalExercises: number;
  totalPersonalRecords: number;
  memberSince: string;
}

export interface ChartStatsBucket {
  start: string;
  end: string;
  value: number;
}

export interface ChartStatsResponse {
  buckets: ChartStatsBucket[];
  metric: string;
  range: string;
  periodTotal: number;
}

// Keep old names as aliases
export type WeeklyStatsWeek = ChartStatsBucket;
export type WeeklyStatsResponse = ChartStatsResponse;

export interface CalendarWorkoutDay {
  date: string;
  sessionCount: number;
  totalDuration: number;
}

export interface CalendarStatsResponse {
  month: number;
  year: number;
  workoutDays: CalendarWorkoutDay[];
}
