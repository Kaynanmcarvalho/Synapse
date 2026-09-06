import { z } from 'zod';
import { isValidCest, isValidEan, isValidNcm } from '../rules/fiscal';
import { moneySchema } from './common.schema';

const eanSchema = z
  .string()
  .trim()
  .refine(isValidEan, { message: 'EAN/GTIN invalido: digito verificador nao confere' });

const ncmSchema = z.string().trim().refine(isValidNcm, { message: 'NCM deve ter 8 digitos' });

const cestSchema = z.string().trim().refine(isValidCest, { message: 'CEST deve ter 7 digitos' });

export const productStatusSchema = z.enum(['active', 'inactive', 'blocked', 'discontinued']);

export const productFiscalSchema = z.object({
  ncm: ncmSchema,
  cest: cestSchema.nullable().default(null),
  defaultCfop: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'CFOP deve ter 4 digitos'),
  cst: z.string().trim().nullable().default(null),
  csosn: z.string().trim().nullable().default(null),
  origin: z.number().int().min(0).max(8),
  pisCode: z.string().trim().nullable().default(null),
  cofinsCode: z.string().trim().nullable().default(null),
  ipiCode: z.string().trim().nullable().default(null),
  icmsCode: z.string().trim().nullable().default(null),
});

export const productLogisticsSchema = z.object({
  unit: z.string().trim().min(1).max(10),
  weightKg: z.number().positive().nullable().default(null),
  packaging: z.string().trim().nullable().default(null),
  quantityPerPackage: z.number().int().positive().default(1),
  minStock: z.number().nonnegative().default(0),
  maxStock: z.number().nonnegative().default(0),
  tracksLot: z.boolean().default(false),
  tracksExpiration: z.boolean().default(false),
});

export const productPricingSchema = z.object({
  cost: moneySchema,
  averageCost: moneySchema,
  lastCost: moneySchema,
  salePrice: moneySchema,
  promotionalPrice: moneySchema.nullable().default(null),
  marginPercent: z.number().finite(),
});

export const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  internalCode: z.string().trim().nullable().default(null),
  ean: eanSchema.nullable().default(null),
  name: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().max(120).nullable().default(null),
  brand: z.string().trim().nullable().default(null),
  manufacturer: z.string().trim().nullable().default(null),
  supplierId: z.string().trim().nullable().default(null),
  categoryId: z.string().trim().nullable().default(null),
  subcategoryId: z.string().trim().nullable().default(null),
  status: productStatusSchema.default('active'),
  logistics: productLogisticsSchema,
  pricing: productPricingSchema,
  fiscal: productFiscalSchema,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productSearchSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  status: productStatusSchema.optional(),
  categoryId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export type ProductSearchInput = z.infer<typeof productSearchSchema>;
