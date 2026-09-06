import { z } from 'zod';

export const registerSessionSchema = z
  .object({
    deviceId: z.string().trim().min(8).max(200),
    name: z.string().trim().min(1).max(120),
    platform: z.enum(['web', 'android']),
  })
  .strict();

export const booleanFlagSchema = z.object({ enabled: z.boolean() }).strict();

export const companyOnboardingSchema = z
  .object({
    legalName: z.string().trim().min(2).max(200),
    tradeName: z.string().trim().min(2).max(200),
    cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos'),
    timezone: z.string().trim().min(3).max(80).default('America/Sao_Paulo'),
  })
  .strict();

export type RegisterSessionInput = z.infer<typeof registerSessionSchema>;
export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;
