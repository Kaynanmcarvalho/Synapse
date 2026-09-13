import type { FiscalAddress, FiscalIssuer } from '@synapse/types';
import type { AlterarFormulario } from '../assistente.tipos';

/** Grade dos formularios longos: 1 coluna no celular, 6 no tablet, 12 no desktop. */
export const GRADE = 'grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6 lg:grid-cols-12';

export const alterarEmitente =
  (alterar: AlterarFormulario) =>
  (parcial: Partial<FiscalIssuer>): void =>
    alterar((atual) => ({ ...atual, issuer: { ...atual.issuer, ...parcial } }));

export const alterarEndereco =
  (alterar: AlterarFormulario) =>
  (parcial: Partial<FiscalAddress>): void =>
    alterar((atual) => ({
      ...atual,
      issuer: { ...atual.issuer, address: { ...atual.issuer.address, ...parcial } },
    }));
