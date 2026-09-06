import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().trim().nullable().default(null),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
