import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common.js';
import {
  EXERCISE_TRACKING_TYPES,
  EXERCISE_EQUIPMENT,
  EXERCISE_MOVEMENT_PATTERNS,
} from '../constants/exercise.js';

export const createExerciseInputSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  trackingType: z.enum(EXERCISE_TRACKING_TYPES as [string, ...string[]]),
  equipment: z.enum(EXERCISE_EQUIPMENT as [string, ...string[]]).optional(),
  movementPattern: z.enum(EXERCISE_MOVEMENT_PATTERNS as [string, ...string[]]).optional(),
  imageUrls: z.array(z.string().max(500)).max(10).optional(),
  instructions: z.string().max(2000).optional(),
  videoUrl: z.string().url().optional(),
});
export type CreateExerciseInput = z.infer<typeof createExerciseInputSchema>;

export const updateExerciseInputSchema = createExerciseInputSchema.partial();
export type UpdateExerciseInput = z.infer<typeof updateExerciseInputSchema>;

export const exerciseFilterSchema = paginationSchema.extend({
  equipment: z.enum(EXERCISE_EQUIPMENT as [string, ...string[]]).optional(),
  movementPattern: z.enum(EXERCISE_MOVEMENT_PATTERNS as [string, ...string[]]).optional(),
  muscleGroupId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
});
export type ExerciseFilter = z.infer<typeof exerciseFilterSchema>;
