import { z } from 'zod';

export const createSellerSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  branchId: z.string().min(1),
  region: z.string().trim().min(1).max(120),
  route: z.string().trim().max(120).nullable().optional(),
  commissionPercent: z.number().min(0).max(100),
  monthlyGoalCentavos: z.number().int().nonnegative(),
});
export type CreateSellerInput = z.infer<typeof createSellerSchema>;

export const updateSellerSchema = createSellerSchema
  .omit({ userId: true })
  .partial()
  .extend({ active: z.boolean().optional() });
export type UpdateSellerInput = z.infer<typeof updateSellerSchema>;
