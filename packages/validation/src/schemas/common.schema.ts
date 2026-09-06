import { z } from 'zod';
import { isValidCpfOrCnpj } from '../rules/document';

export const idSchema = z.string().trim().min(1).max(128);

export const documentSchema = z
  .string()
  .trim()
  .refine(isValidCpfOrCnpj, { message: 'CPF ou CNPJ invalido' });

export const emailSchema = z.string().trim().toLowerCase().email();

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export const moneySchema = z.number().finite().nonnegative().multipleOf(0.01);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
