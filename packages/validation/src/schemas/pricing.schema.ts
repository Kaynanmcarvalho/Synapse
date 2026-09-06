import { z } from 'zod';
import { isoDateSchema, moneySchema } from './common.schema';

export const salesChannelSchema = z.enum(['atacado', 'varejo']);

export const createPriceTableEntrySchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  price: moneySchema,
  branchId: z.string().trim().nullable().default(null),
  customerGroupId: z.string().trim().nullable().default(null),
  sellerId: z.string().trim().nullable().default(null),
  channel: salesChannelSchema.nullable().default(null),
  minQuantity: z.number().positive().nullable().default(null),
  startsAt: isoDateSchema.nullable().default(null),
  endsAt: isoDateSchema.nullable().default(null),
});

export type CreatePriceTableEntryInput = z.infer<typeof createPriceTableEntrySchema>;

export const resolvePriceSchema = z.object({
  productId: z.string().trim().min(1),
  branchId: z.string().trim().nullable().default(null),
  customerId: z.string().trim().optional(),
  customerGroupId: z.string().trim().optional(),
  sellerId: z.string().trim().optional(),
  quantity: z.number().positive().default(1),
  channel: salesChannelSchema.optional(),
  at: isoDateSchema.optional(),
  negotiatedPrice: moneySchema.optional(),
});

export type ResolvePriceInput = z.infer<typeof resolvePriceSchema>;
