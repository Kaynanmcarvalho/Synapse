import type { CarteiraDoCliente, PedidoDeVenda } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import {
  descricaoDoParcelamento,
  diferencaParaMedia,
  parcelasDoPedido,
  referenciasDoCliente,
  semCobranca,
  vencimentosDoPedido,
} from './parcelas';

const pedido = (extra: Partial<PedidoDeVenda> = {}) =>
  ({
    tipo: 'VENDA',
    condicaoDePagamento: '14/21/28/35',
    vencimentosEmDias: [],
    totalCentavos: 100_003,
    ...extra,
  }) as PedidoDeVenda;

// 13/09/2026, meio-dia local: longe da virada do dia, em qualquer fuso.
const HOJE = new Date(2026, 8, 13, 12, 0);

describe('vencimentos do pedido', () => {
  it('usa os dias gravados quando o pedido ja traz', () => {
    expect(vencimentosDoPedido(pedido({ vencimentosEmDias: [42, 14, 28] }))).toEqual([14, 28, 42]);
  });

  it('le a condicao dos pedidos antigos, do jeito que o balcao escreve', () => {
    expect(vencimentosDoPedido(pedido())).toEqual([14, 21, 28, 35]);
    expect(vencimentosDoPedido(pedido({ condicaoDePagamento: 'Cheque 14/21' }))).toEqual([14, 21]);
    expect(vencimentosDoPedido(pedido({ condicaoDePagamento: 'Cartão 3x' }))).toEqual([30, 60, 90]);
    expect(vencimentosDoPedido(pedido({ condicaoDePagamento: 'À vista' }))).toEqual([0]);
  });

  it('descreve o parcelamento como se fala', () => {
    expect(descricaoDoParcelamento([14, 21, 28, 35])).toBe('14/21/28/35');
    expect(descricaoDoParcelamento([0])).toBe('À vista');
  });
});

describe('parcelas', () => {
  it('conta os vencimentos a partir de hoje e fecha o total', () => {
    const parcelas = parcelasDoPedido(pedido(), HOJE);
    expect(parcelas.map((p) => p.vencimento)).toEqual([
      '2026-09-27',
      '2026-10-04',
      '2026-10-11',
      '2026-10-18',
    ]);
    expect(parcelas.reduce((soma, p) => soma + p.valorCentavos, 0)).toBe(100_003);
    // Os 3 centavos que sobram da divisao ficam na primeira.
    expect(parcelas.map((p) => p.valorCentavos)).toEqual([25_003, 25_000, 25_000, 25_000]);
  });

  it('a vista e uma parcela so, com vencimento hoje', () => {
    const [unica] = parcelasDoPedido(pedido({ condicaoDePagamento: 'PIX' }), HOJE);
    expect(unica).toMatchObject({ numero: 1, dias: 0, vencimento: '2026-09-13' });
  });

  it('bonificacao e troca nao geram parcela', () => {
    expect(semCobranca(pedido({ tipo: 'BONIFICACAO' }))).toBe(true);
    expect(semCobranca(pedido({ condicaoDePagamento: 'Sem cobrança' }))).toBe(true);
    expect(parcelasDoPedido(pedido({ tipo: 'TROCA' }), HOJE)).toEqual([]);
  });
});

describe('comparacao com o historico do cliente', () => {
  const carteira = {
    pagamentos: [{ valorCentavos: 20_000 }, { valorCentavos: 30_000 }],
    titulosEmAberto: [{ saldoCentavos: 10_000 }],
  } as unknown as CarteiraDoCliente;

  it('calcula a media paga e a media em aberto', () => {
    expect(referenciasDoCliente(carteira)).toEqual({
      mediaPagaCentavos: 25_000,
      mediaEmAbertoCentavos: 10_000,
    });
  });

  it('diz quanto a parcela passa da media', () => {
    expect(diferencaParaMedia(30_000, 25_000)).toBe(20);
    expect(diferencaParaMedia(20_000, 25_000)).toBe(-20);
    expect(diferencaParaMedia(20_000, null)).toBeNull();
  });
});
