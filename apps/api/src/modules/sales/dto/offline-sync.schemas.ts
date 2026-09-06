import { z } from 'zod';

export const offlineOrderSchema = z.object({
  localId: z.string().uuid(),
  idempotencyKey: z.string().min(16).max(120),
  branchId: z.string().min(1),
  warehouseId: z.string().min(1),
  customerId: z.string().min(1),
  sellerId: z.string().min(1),
  createdAt: z.string().datetime(),
  version: z.number().int().positive(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        description: z.string().min(1),
        quantity: z.number().int().positive(),
        cachedUnitPrice: z.number().int().nonnegative(),
        discount: z.number().int().nonnegative().default(0),
      }),
    )
    .min(1),
});
export type OfflineOrderInput = z.infer<typeof offlineOrderSchema>;
