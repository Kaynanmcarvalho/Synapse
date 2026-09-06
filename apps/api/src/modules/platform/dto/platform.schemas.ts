import { z } from 'zod';

export const integrationServiceIdSchema = z.enum([
  'SEFAZ_NFE',
  'SEFAZ_NFCE',
  'MDFE',
  'SICREDI',
  'ITAU',
]);
export type IntegrationServiceIdParam = z.infer<typeof integrationServiceIdSchema>;

export const activateProductionSchema = z.object({
  confirmation: z.string().min(1),
});
export type ActivateProductionInput = z.infer<typeof activateProductionSchema>;
