import { z } from 'zod';
import { uuidSchema, nonNegativeInt } from './common.js';

export const createProgramInputSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  folderId: uuidSchema.optional(),
});
export type CreateProgramInput = z.infer<typeof createProgramInputSchema>;

export const updateProgramInputSchema = createProgramInputSchema.partial();
export type UpdateProgramInput = z.infer<typeof updateProgramInputSchema>;

export const createProgramFolderInputSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  sortOrder: nonNegativeInt.optional(),
});
export type CreateProgramFolderInput = z.infer<typeof createProgramFolderInputSchema>;
