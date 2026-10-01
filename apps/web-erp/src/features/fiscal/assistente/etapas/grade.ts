import type { FiscalAddress, FiscalIssuer } from '@synapse/types';
import type { AlterarFormulario } from '../assistente.tipos';

/** Atualizadores do emitente e do endereço. A antiga grade de 12 colunas
 *  (`GRADE`) saiu na Fase 8: a largura agora vem do dado (`larguras.ts`). */

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
