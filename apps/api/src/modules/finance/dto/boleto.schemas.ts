import { z } from 'zod';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const cents = z.number().int().positive().max(100_000_000_000);
export const installmentSchema = z
  .object({
    accountId: id,
    branchId: id,
    customerId: id,
    orderId: id.nullable().default(null),
    description: z.string().trim().min(1).max(240),
    idempotencyKey: id,
    totalCentavos: cents,
    installments: z.number().int().min(1).max(60),
    firstDueDate: z.string().date(),
    interestPercent: z.number().min(0).max(100).default(0),
    finePercent: z.number().min(0).max(100).default(0),
    discountCentavos: z.number().int().nonnegative().default(0),
    payer: z
      .object({
        nome: z.string().min(1).max(240),
        documento: z.string().regex(/^(\d{11}|\d{14})$/),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) => value.discountCentavos < value.totalCentavos,
    'Desconto deve ser menor que o total',
  );
export type InstallmentInput = z.infer<typeof installmentSchema>;
export const manualSettlementSchema = z
  .object({ eventId: id, amountCentavos: cents, note: z.string().min(3).max(500) })
  .strict();

const bankFields = {
  conta: z.string().min(1),
  carteira: z.string().min(1),
  chavePix: z.string(),
  clientIdSecretRef: z.string().min(1),
  clientSecretSecretRef: z.string().min(1),
  certificadoSecretRef: z.string().min(1),
};
export const bankAccountSchema = z
  .object({
    id,
    bankId: z.enum(['SICREDI', 'ITAU']),
    environment: z.enum(['MOCK', 'SANDBOX', 'HOMOLOGACAO', 'PRODUCAO']),
    apelido: z.string().min(1).max(120),
    ativo: z.boolean(),
    baseUrl: z.string().url().startsWith('https://').nullable(),
    sicredi: z
      .object({ ...bankFields, cooperativa: z.string().min(1), posto: z.string().min(1) })
      .optional(),
    itau: z.object({ ...bankFields, agencia: z.string().min(1) }).optional(),
  })
  .strict();
