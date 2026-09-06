import { z } from 'zod';

const money = z.number().int().nonnegative();
export const openCashSessionSchema = z.object({
  branchId: z.string().min(1),
  openingAmount: money,
});
export const cashMovementSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().trim().min(3).max(240),
});
export const closeCashSessionSchema = z.object({ countedCash: money });
export const completePosSaleSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  customerTaxId: z
    .string()
    .regex(/^(\d{11}|\d{14})$/)
    .nullable()
    .optional(),
  sellerId: z.string().min(1),
  operatorDiscountLimitBasisPoints: z.number().int().min(0).max(10_000),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        barcode: z.string().min(8).max(14).nullable().optional(),
        description: z.string().trim().min(1).max(240),
        quantity: z.number().int().positive(),
        unitPrice: money,
        discount: money.default(0),
        surcharge: money.default(0),
      }),
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.enum([
          'CASH',
          'PIX',
          'DEBIT_CARD',
          'CREDIT_CARD',
          'BOLETO',
          'ON_ACCOUNT',
          'WALLET',
        ]),
        amount: z.number().int().positive(),
        reference: z.string().max(120).nullable().optional(),
      }),
    )
    .min(1),
});

export type CashMovementInput = z.infer<typeof cashMovementSchema>;
export type CompletePosSaleInput = z.infer<typeof completePosSaleSchema>;
