import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common.js';
import { PERSONAL_RECORD_TYPES } from '../constants/record.js';

export const personalRecordFilterSchema = paginationSchema.extend({
  exerciseId: uuidSchema.optional(),
  prType: z.enum(PERSONAL_RECORD_TYPES as [string, ...string[]]).optional(),
});
export type PersonalRecordFilter = z.infer<typeof personalRecordFilterSchema>;
