import type { CashSession, ItemDeTabela } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { resumoDoCaixa } from './caixa';
import { documentoDaNota, resumirPagamento } from './pagamento';

const forma = (codigo: number, meio: ItemDeTabela['meio']): ItemDeTabela =>
  ({ codigo, nome: String(meio), meio, ativo: true }) as ItemDeTabela;

describe('pagamento do PDV', () => {
  it('mostra o que falta e o troco', () => {
    expect(resumirPagamento(15_000, [])).toEqual({
      totalCentavos: 15_000,
      pagoCentavos: 0,
      faltaCentavos: 15_000,
      trocoCentavos: 0,
    });
    expect(
      resumirPagamento(15_000, [
        { forma: forma(2, 'PIX'), valorCentavos: 10_000 },
        { forma: forma(1, 'DINHEIRO'), valorCentavos: 10_000 },
      ]),
    ).toMatchObject({ faltaCentavos: 0, trocoCentavos: 5_000 });
  });

  it('só CPF ou CNPJ completo vai para a NFC-e', () => {
    expect(documentoDaNota('12345678901')).toBe('12345678901');
    expect(documentoDaNota('34281018000120')).toBe('34281018000120');
    expect(documentoDaNota('123')).toBeNull();
    expect(documentoDaNota(null)).toBeNull();
  });

  it('explica o dinheiro esperado na gaveta', () => {
    const caixa = {
      openingAmount: 10_000,
      expectedCash: 32_000,
      movements: [
        { type: 'OPENING', amount: 10_000 },
        { type: 'SUPPLY', amount: 5_000 },
        { type: 'WITHDRAWAL', amount: 3_000 },
      ],
    } as unknown as CashSession;
    expect(resumoDoCaixa(caixa)).toEqual({
      abertura: 10_000,
      suprimentos: 5_000,
      sangrias: 3_000,
      vendasEmDinheiro: 20_000,
      esperado: 32_000,
    });
  });
});
