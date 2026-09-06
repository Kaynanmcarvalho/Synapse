import { z } from 'zod';

const purchaseOrderStatusSchema = z.enum([
  'RASCUNHO',
  'EM_COTACAO',
  'APROVADO',
  'RECEBIDO_PARCIAL',
  'RECEBIDO',
  'CANCELADO',
]);

export const listPurchaseOrdersQuerySchema = z.object({
  branchId: z.string().min(1),
  status: purchaseOrderStatusSchema.optional(),
});
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().min(1),
  warehouseId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityOrdered: z.number().int().positive(),
      }),
    )
    .min(1),
  sourceSuggestionIds: z.array(z.string().min(1)).default([]),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const addQuoteSchema = z.object({
  supplierId: z.string().min(1),
  leadDays: z.number().int().positive(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        unitCostCentavos: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});
export type AddQuoteInput = z.infer<typeof addQuoteSchema>;

export const selectSupplierSchema = z.object({
  supplierId: z.string().min(1),
});
export type SelectSupplierInput = z.infer<typeof selectSupplierSchema>;

export const receiveManualSchema = z.object({
  warehouseId: z.string().min(1),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityReceived: z.number().int().positive(),
        unitCostReceived: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});
export type ReceiveManualInput = z.infer<typeof receiveManualSchema>;

export const receiveXmlSchema = z.object({
  warehouseId: z.string().min(1),
  xml: z.string().min(1),
});
export type ReceiveXmlInput = z.infer<typeof receiveXmlSchema>;
