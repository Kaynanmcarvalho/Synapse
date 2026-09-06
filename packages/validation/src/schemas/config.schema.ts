import { z } from 'zod';
import { CONFIG_DOMAINS } from '@synapse/types';

/** A chave de uma configuracao e sempre `<dominio>.<algo>` — o prefixo trava
 *  o valor a um dos dez dominios da secao 4. */
export const configKeySchema = z
  .string()
  .trim()
  .refine(
    (key) => CONFIG_DOMAINS.some((domain) => key === domain || key.startsWith(`${domain}.`)),
    { message: `A chave precisa comecar com um dos dominios: ${CONFIG_DOMAINS.join(', ')}` },
  );

export const setConfigSchema = z.object({
  key: configKeySchema,
  value: z.unknown(),
});

export type SetConfigInput = z.infer<typeof setConfigSchema>;
