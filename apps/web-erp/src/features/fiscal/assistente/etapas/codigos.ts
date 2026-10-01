import type { NfceAcquirer } from '@synapse/types';

export type ModoDeCodigo = 'ESTABELECIMENTO' | 'BANDEIRA';

/** A regra de inclusão de código de credenciadora, idêntica à de antes:
 *  código de estabelecimento não repete; código de bandeira substitui o que a
 *  bandeira já tinha. `null` = nada muda. */
export const incluirCodigo = (
  credenciadora: NfceAcquirer,
  modo: ModoDeCodigo,
  codigo: string,
  bandeira: string,
): Partial<NfceAcquirer> | null => {
  const limpo = codigo.trim();
  if (!limpo) return null;
  if (modo === 'ESTABELECIMENTO')
    return credenciadora.establishmentCodes.includes(limpo)
      ? null
      : { establishmentCodes: [...credenciadora.establishmentCodes, limpo] };
  const outras = credenciadora.brandCodes.filter((item) => item.brand !== bandeira);
  return { brandCodes: [...outras, { brand: bandeira, code: limpo }] };
};
