import type { PedidoDeVenda } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import {
  descricaoDoAtraso,
  descricaoDoPagamento,
  formatarData,
  formatarMoeda,
  formatarQuantidade,
  prazoDoPedido,
  resumoDoPedido,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_TIPO,
} from './analise';

const pedido = (extra: Partial<PedidoDeVenda> = {}): PedidoDeVenda =>
  ({
    tipo: 'VENDA',
    condicaoDePagamento: '28/35/42 dias',
    prazoMedioEmDias: 35,
    itens: [{}],
    ...extra,
  }) as PedidoDeVenda;

describe('formatacoes da analise de credito', () => {
  it('mostra centavos como real', () => {
    expect(formatarMoeda(609_480).replace(/\s/g, ' ')).toBe('R$ 6.094,80');
  });

  it('mostra a data sem deixar o fuso roubar um dia', () => {
    expect(formatarData('2026-09-01')).toBe('01/09/2026');
    expect(formatarData('2026-09-01T23:30:00.000Z')).toBe('01/09/2026');
  });

  it('converte quantidade em milesimos para unidades', () => {
    expect(formatarQuantidade(40_000)).toBe('40');
    expect(formatarQuantidade(1_500)).toBe('1,5');
  });
});

describe('leitura de atraso e pagamento', () => {
  it('titulo sem vencer nao inventa atraso', () => {
    expect(descricaoDoAtraso(0)).toBe('A vencer');
  });

  it('conta os dias vencidos no singular e no plural', () => {
    expect(descricaoDoAtraso(1)).toBe('1 dia em atraso');
    expect(descricaoDoAtraso(14)).toBe('14 dias em atraso');
  });

  it('zero e pagamento em dia; negativo e adiantado; positivo e atraso', () => {
    expect(descricaoDoPagamento(0)).toBe('Em dia');
    expect(descricaoDoPagamento(-1)).toBe('1 dia adiantado');
    expect(descricaoDoPagamento(-3)).toBe('3 dias adiantado');
    expect(descricaoDoPagamento(5)).toBe('5 dias de atraso');
  });
});

describe('resumo do pedido', () => {
  it('a vista quando nao ha prazo', () => {
    expect(prazoDoPedido(pedido({ prazoMedioEmDias: 0 }))).toBe('À vista');
    expect(prazoDoPedido(pedido())).toBe('35 dias');
  });

  it('junta tipo, condicao e quantidade de itens', () => {
    expect(resumoDoPedido(pedido())).toBe('Venda · 28/35/42 dias · 1 item');
    expect(resumoDoPedido(pedido({ tipo: 'BONIFICACAO', itens: [{}, {}] as never }))).toBe(
      'Bonificação · 28/35/42 dias · 2 itens',
    );
  });

  it('traduz tipo e origem para a tela', () => {
    expect(ROTULO_DO_TIPO.TROCA).toBe('Troca');
    expect(ROTULO_DA_ORIGEM.MOBILE).toBe('Celular');
  });
});
