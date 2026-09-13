import { z } from 'zod';
import { isValidCnpj } from '../rules/document';
import { clienteSchema } from './cliente.schema';

const digits = (value: string) => value.replace(/\D/g, '');
const ie = z
  .string()
  .transform(digits)
  .refine((value) => /^\d{2,14}$/.test(value), 'Inscrição estadual inválida');
/** O cadastro de clientes e um so: `customerSchema` continua valendo como nome
 *  antigo do mesmo contrato, para nao existir uma segunda validacao de cliente. */
export const customerSchema = clienteSchema;

export const supplierSchema = z.object({
  taxId: z.string().transform(digits).refine(isValidCnpj, 'CNPJ inválido'),
  stateRegistration: ie,
  legalName: z.string().min(2).max(160),
  tradeName: z.string().min(2).max(160),
  contacts: z
    .array(
      z.object({
        name: z.string().min(2),
        phone: z.string().transform(digits),
        email: z.string().email().nullable().default(null),
      }),
    )
    .max(20),
  paymentTermId: z.string().nullable().default(null),
  averageLeadDays: z.number().int().nonnegative(),
  safetyStockByProduct: z.record(z.number().int().nonnegative()).optional(),
  averagePrice: z.number().int().nonnegative(),
  productIds: z.array(z.string()).max(500),
  active: z.boolean().default(true),
});
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
