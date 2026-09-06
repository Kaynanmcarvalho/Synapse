import { z } from 'zod';

export const stockCommandSchema = z.object({
  branchId: z.string().min(1),
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  sourceId: z.string().min(1),
  destinationId: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  reason: z.string().trim().min(3),
  idempotencyKey: z.string().min(8),
  allowNegative: z.boolean().default(false),
});
export type StockCommand = z.infer<typeof stockCommandSchema>;
