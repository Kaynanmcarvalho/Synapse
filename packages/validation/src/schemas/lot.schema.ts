import { z } from 'zod';
import { isoDateSchema } from './common.schema';

export const createLotSchema = z
  .object({
    branchId: z.string().trim().min(1),
    warehouseId: z.string().trim().min(1),
    productId: z.string().trim().min(1),
    supplierId: z.string().trim().nullable().default(null),
    manufacturedAt: isoDateSchema,
    expiresAt: isoDateSchema,
    quantity: z.number().positive(),
  })
  .refine((value) => value.expiresAt > value.manufacturedAt, {
    message: 'A validade precisa ser depois da fabricação',
    path: ['expiresAt'],
  });

export type CreateLotInput = z.infer<typeof createLotSchema>;

export const reserveFefoSchema = z.object({
  branchId: z.string().trim().min(1),
  warehouseId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  quantity: z.number().positive(),
  sourceId: z.string().trim().min(1),
});

export type ReserveFefoInput = z.infer<typeof reserveFefoSchema>;
