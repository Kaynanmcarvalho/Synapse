import type { NfceAcquirer } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { formularioPadrao, segredosGravados, segredosVazios } from './assistente.padrao';
import { listarPendencias } from './assistente.pendencias';
import { incluirCodigo } from './etapas/codigos';

/** Fase 8: `campo` só diz onde a pendência aparece. Estes testes travam que
 *  as regras continuam as mesmas (mensagem, bloqueio, aba) e que a regra de
 *  códigos de credenciadora não mudou ao sair do componente. */

const pendencias = (mudar: (f: ReturnType<typeof formularioPadrao>) => object) =>
  listarPendencias(
    { ...formularioPadrao(), ...mudar(formularioPadrao()) } as never,
    segredosVazios(),
    segredosGravados(null),
  );

describe('pendências com campo', () => {
  it('CNPJ inválido continua bloqueando, agora apontando para issuer.document', () => {
    const p = pendencias((f) => ({ issuer: { ...f.issuer, document: '11222333000100' } })).find(
      (item) => item.mensagem === 'CNPJ do emitente inválido.',
    );
    expect(p).toMatchObject({ etapa: 'empresa', bloqueia: true, campo: 'issuer.document' });
  });

  it('regras de conjunto continuam sem campo (ficam no nível da etapa)', () => {
    const lista = pendencias(() => ({}));
    expect(lista.find((p) => p.mensagem.startsWith('Complete o endereço'))?.campo).toBeUndefined();
  });

  it('CFOP da NF-e mantém a aba e ganha o campo', () => {
    const p = pendencias((f) => ({ nfe: { ...f.nfe, cfopInState: '6102' } })).find(
      (item) => item.etapa === 'nfe' && item.mensagem.startsWith('CFOP dentro'),
    );
    expect(p).toMatchObject({ aba: 'configuracoes', bloqueia: true, campo: 'nfe.cfopInState' });
  });
});

describe('incluirCodigo', () => {
  const base: NfceAcquirer = {
    id: 'a',
    legalName: 'X',
    tradeName: '',
    cnpj: '',
    establishmentCodes: ['10'],
    brandCodes: [{ brand: 'Visa', code: '1' }],
  };
  it('estabelecimento não repete; bandeira substitui', () => {
    expect(incluirCodigo(base, 'ESTABELECIMENTO', ' 10 ', 'Visa')).toBeNull();
    expect(incluirCodigo(base, 'ESTABELECIMENTO', '20', 'Visa')).toEqual({
      establishmentCodes: ['10', '20'],
    });
    expect(incluirCodigo(base, 'BANDEIRA', '9', 'Visa')).toEqual({
      brandCodes: [{ brand: 'Visa', code: '9' }],
    });
    expect(incluirCodigo(base, 'BANDEIRA', '  ', 'Visa')).toBeNull();
  });
});
