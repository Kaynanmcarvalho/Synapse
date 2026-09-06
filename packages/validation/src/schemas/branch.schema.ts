import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  isHeadquarters: z.boolean().default(false),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = createBranchSchema.partial();

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
