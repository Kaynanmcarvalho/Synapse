import { z } from 'zod';

export const listStockIntelligenceQuerySchema = z.object({
  branchId: z.string().min(1),
  abcClass: z.enum(['A', 'B', 'C']).optional(),
  onlyDeadStock: z.coerce.boolean().optional(),
  onlyExcess: z.coerce.boolean().optional(),
  onlySuggested: z.coerce.boolean().optional(),
});
export type ListStockIntelligenceQuery = z.infer<typeof listStockIntelligenceQuerySchema>;

export const recalculateStockIntelligenceSchema = z.object({
  branchId: z.string().min(1),
});
export type RecalculateStockIntelligenceInput = z.infer<typeof recalculateStockIntelligenceSchema>;

export const adjustSuggestionSchema = z.object({
  branchId: z.string().min(1),
  approvedPurchaseQty: z.number().int().min(0),
  note: z.string().trim().max(500).optional(),
});
export type AdjustSuggestionInput = z.infer<typeof adjustSuggestionSchema>;
