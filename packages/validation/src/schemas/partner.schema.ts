import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '../rules/document';

const digits = (value: string) => value.replace(/\D/g, '');
const ie = z
  .string()
  .transform(digits)
  .refine((value) => /^\d{2,14}$/.test(value), 'Inscrição estadual inválida');
const address = z.object({
  street: z.string().min(2),
  number: z.string().min(1),
  complement: z.string().nullable().default(null),
  district: z.string().min(2),
  city: z.string().min(2),
  state: z
    .string()
    .length(2)
    .transform((value) => value.toUpperCase()),
  postalCode: z
    .string()
    .transform(digits)
    .refine((value) => value.length === 8, 'CEP inválido'),
});
export const customerSchema = z
  .object({
    type: z.enum(['PF', 'PJ', 'RURAL_PRODUCER']),
    taxId: z.string().transform(digits),
    stateRegistration: ie.nullable().default(null),
    municipalRegistration: z.string().max(20).nullable().default(null),
    name: z.string().trim().min(2).max(160),
    legalName: z.string().trim().max(160).nullable().default(null),
    address,
    phone: z
      .string()
      .transform(digits)
      .refine((value) => value.length >= 10 && value.length <= 13, 'Telefone inválido'),
    whatsapp: z.string().transform(digits).nullable().default(null),
    email: z.string().email().nullable().default(null),
    creditLimit: z.number().int().nonnegative(),
    responsibleSellerId: z.string().nullable().default(null),
    priceTableId: z.string().nullable().default(null),
    paymentTermId: z.string().nullable().default(null),
    active: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    const valid = value.type === 'PF' ? isValidCpf(value.taxId) : isValidCnpj(value.taxId);
    if (!valid)
      context.addIssue({
        code: 'custom',
        path: ['taxId'],
        message: value.type === 'PF' ? 'CPF inválido' : 'CNPJ inválido',
      });
    if (value.type === 'RURAL_PRODUCER' && !value.stateRegistration)
      context.addIssue({
        code: 'custom',
        path: ['stateRegistration'],
        message: 'Produtor rural exige inscrição estadual',
      });
  });
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
  averagePrice: z.number().int().nonnegative(),
  productIds: z.array(z.string()).max(500),
  active: z.boolean().default(true),
});
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
