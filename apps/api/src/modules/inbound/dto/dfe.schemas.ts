import { z } from 'zod';
import { MANIFESTACOES } from '../entities/conferencia';

export const pollDfeSchema = z.object({
  companyId: z.string().min(1),
  cnpj: z.string().regex(/^\d{14}$/),
  lastNsu: z.string().regex(/^\d+$/).optional(),
});

export const importDfeXmlSchema = z.object({
  xml: z.string().min(20).max(10_000_000),
});

export const manifestDfeSchema = z.object({
  companyId: z.string().min(1),
  manifestacao: z.enum(MANIFESTACOES),
  justificativa: z.string().trim().max(255).nullable().optional(),
});

export const supplierMappingSchema = z.object({
  cnpjEmitente: z.string().regex(/^\d{14}$/),
  codigoDoFornecedor: z.string().min(1).max(120),
  productId: z.string().min(1),
  fatorDeConversao: z.number().positive().max(1_000_000),
});

export const checkDfeItemSchema = z.object({
  productId: z.string().min(1),
  quantidadeMilesimos: z.number().int().positive(),
  custoUnitarioCentavos: z.number().int().nonnegative(),
  lote: z.string().trim().max(120).nullable().optional(),
  validade: z.string().date().nullable().optional(),
});

export const launchDfeSchema = z.object({
  branchId: z.string().min(1),
  warehouseId: z.string().min(1),
  supplierId: z.string().min(1),
  defaultDueDate: z.string().date(),
});

export type PollDfeInput = z.infer<typeof pollDfeSchema>;
export type ImportDfeXmlInput = z.infer<typeof importDfeXmlSchema>;
export type ManifestDfeInput = z.infer<typeof manifestDfeSchema>;
export type SupplierMappingInput = z.infer<typeof supplierMappingSchema>;
export type CheckDfeItemInput = z.infer<typeof checkDfeItemSchema>;
export type LaunchDfeInput = z.infer<typeof launchDfeSchema>;
