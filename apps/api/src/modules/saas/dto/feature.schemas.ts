import { z } from 'zod';
import { FEATURE_KEYS } from '../feature.types';

export const updateFeatureSchema = z.object({
  feature: z.enum(FEATURE_KEYS),
  enabled: z.boolean(),
});
export const updateBrandingSchema = z
  .object({
    systemName: z.string().trim().min(2).max(80).optional(),
    legalName: z.string().trim().min(2).max(120).optional(),
    logoUrl: z.string().url().nullable().optional(),
    faviconUrl: z.string().url().nullable().optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    secondaryColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Informe ao menos uma alteração' });
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
