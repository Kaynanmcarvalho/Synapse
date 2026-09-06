import { z } from 'zod';

export const recordConsentSchema = z.object({
  purpose: z.enum(['MARKETING', 'DATA_SHARING', 'ESSENTIAL']),
  granted: z.boolean(),
});

export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
