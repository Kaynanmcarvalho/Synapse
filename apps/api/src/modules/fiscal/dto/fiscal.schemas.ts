import { z } from 'zod';

export const fiscalConfigSchema = z.object({
  companyId: z.string().min(1),
  environment: z.enum(['MOCK', 'SANDBOX', 'HOMOLOGACAO', 'PRODUCAO']),
  provider: z.enum(['MOCK', 'GYN_FISCAL']),
  crt: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  stateRegistration: z.string().min(2).max(20),
  cscId: z.string().max(20).nullable().optional(),
  csc: z.string().max(120).nullable().optional(),
  nfeSeries: z.number().int().min(1).max(999),
  nfceSeries: z.number().int().min(1).max(999),
  nfceContingencyEnabled: z.boolean().default(true),
  nfceCancellationWindowMinutes: z.number().int().min(1).max(1440).default(30),
  state: z.string().length(2),
  taxRegime: z.string().min(1).max(80),
  certificateBase64: z.string().min(1).nullable().optional(),
  certificatePassword: z.string().min(1).max(200).nullable().optional(),
  providerApiKey: z.string().min(1).max(300).nullable().optional(),
  providerTenantId: z.string().min(1).max(120).nullable().optional(),
  productionConfirmation: z.literal('ATIVAR PRODUCAO').optional(),
});

export const issueNfeSchema = z.object({
  companyId: z.string().min(1),
  referenceId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(120),
  payload: z.record(z.unknown()),
});
export const fiscalEventSchema = z.object({
  justification: z.string().trim().min(15).max(255),
  idempotencyKey: z.string().min(8).max(120),
});
export const retryNfceSchema = z.object({
  idempotencyKey: z.string().min(8).max(120),
});
export const invalidateNfeSchema = z
  .object({
    companyId: z.string().min(1),
    series: z.number().int().min(1).max(999),
    firstNumber: z.number().int().positive(),
    lastNumber: z.number().int().positive(),
    justification: z.string().trim().min(15).max(255),
  })
  .refine((value) => value.lastNumber >= value.firstNumber, {
    message: 'Faixa final deve ser maior ou igual à inicial',
  });
export type FiscalConfigInput = z.infer<typeof fiscalConfigSchema>;
export type IssueNfeInput = z.infer<typeof issueNfeSchema>;
export type FiscalEventInput = z.infer<typeof fiscalEventSchema>;
export type RetryNfceInput = z.infer<typeof retryNfceSchema>;
export type InvalidateNfeInput = z.infer<typeof invalidateNfeSchema>;
