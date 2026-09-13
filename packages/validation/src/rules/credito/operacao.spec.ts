import type { TipoDePedido } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { classeDaOperacao, ehVendaEfetiva } from './operacao';

const TIPOS: TipoDePedido[] = [
  'VENDA',
  'BONIFICACAO',
  'TROCA',
  'AMOSTRA',
  'DEVOLUCAO',
  'CONSIGNACAO',
];

describe('classeDaOperacao', () => {
  it.each<[TipoDePedido, string]>([
    ['VENDA', 'VENDA'],
    ['BONIFICACAO', 'SEM_COBRANCA'],
    ['TROCA', 'SEM_COBRANCA'],
    ['AMOSTRA', 'SEM_COBRANCA'],
    ['DEVOLUCAO', 'SEM_COBRANCA'],
    ['CONSIGNACAO', 'CONSIGNACAO'],
  ])('%s e %s', (tipo, classe) => {
    expect(classeDaOperacao(tipo)).toBe(classe);
  });

  it('so venda e venda efetiva: consignacao ainda nao foi vendida', () => {
    expect(TIPOS.filter(ehVendaEfetiva)).toEqual(['VENDA']);
  });
});
