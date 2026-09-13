import { describe, expect, it } from 'vitest';
import {
  exposicaoDoPedido,
  naturezaDaCobranca,
  vencimentosDoPedido,
  type PedidoParaExposicao,
} from './exposicao';

const pedido = (dados: Partial<PedidoParaExposicao> = {}): PedidoParaExposicao => ({
  tipo: 'VENDA',
  formaDePagamento: 'Boleto',
  condicaoDePagamento: '28/35/42 dias',
  vencimentosEmDias: [28, 35, 42],
  totalCentavos: 300_000,
  ...dados,
});

describe('exposicaoDoPedido', () => {
  it('boleto a prazo: todo o valor e credito concedido', () => {
    const exposicao = exposicaoDoPedido(pedido());
    expect(exposicao).toMatchObject({
      natureza: 'A_PRAZO',
      valorComercialCentavos: 300_000,
      financiadoCentavos: 300_000,
      exposicaoCentavos: 300_000,
      consomeLimite: true,
    });
  });

  it('PIX a vista nao compromete limite', () => {
    const exposicao = exposicaoDoPedido(
      pedido({ formaDePagamento: 'PIX', condicaoDePagamento: 'À vista', vencimentosEmDias: [] }),
    );
    expect(exposicao.natureza).toBe('IMEDIATA');
    expect(exposicao.exposicaoCentavos).toBe(0);
    expect(exposicao.consomeLimite).toBe(false);
    expect(exposicao.valorComercialCentavos).toBe(300_000);
  });

  it('PIX com prazo e credito: o cliente paga depois, so que por PIX', () => {
    const exposicao = exposicaoDoPedido(
      pedido({ formaDePagamento: 'PIX', condicaoDePagamento: '30 dias', vencimentosEmDias: [30] }),
    );
    expect(exposicao.natureza).toBe('A_PRAZO');
    expect(exposicao.exposicaoCentavos).toBe(300_000);
  });

  it('troca sem cobranca: exposicao zero e nada financiado', () => {
    const exposicao = exposicaoDoPedido(
      pedido({ tipo: 'TROCA', formaDePagamento: 'Troca', condicaoDePagamento: 'Sem cobrança' }),
    );
    expect(exposicao).toMatchObject({
      natureza: 'SEM_COBRANCA',
      exposicaoCentavos: 0,
      financiadoCentavos: 0,
      consomeLimite: false,
    });
  });

  it.each(['BONIFICACAO', 'AMOSTRA', 'DEVOLUCAO'] as const)('%s nao gera cobranca', (tipo) => {
    expect(naturezaDaCobranca(pedido({ tipo }))).toBe('SEM_COBRANCA');
  });

  it('venda com condicao "sem cobrança" tambem nao gera titulo', () => {
    expect(naturezaDaCobranca(pedido({ condicaoDePagamento: 'Sem cobrança' }))).toBe(
      'SEM_COBRANCA',
    );
  });

  it('entrada + saldo: so o saldo financiado compromete o limite', () => {
    const exposicao = exposicaoDoPedido(pedido({ entradaCentavos: 100_000 }));
    expect(exposicao.entradaCentavos).toBe(100_000);
    expect(exposicao.financiadoCentavos).toBe(200_000);
    expect(exposicao.exposicaoCentavos).toBe(200_000);
    expect(exposicao.explicacao).toContain('depois da entrada');
  });

  it('entrada maior que o pedido vale no maximo o total', () => {
    const exposicao = exposicaoDoPedido(pedido({ entradaCentavos: 999_999 }));
    expect(exposicao.entradaCentavos).toBe(300_000);
    expect(exposicao.exposicaoCentavos).toBe(0);
    expect(exposicao.consomeLimite).toBe(false);
  });

  it('cartao: o recebivel e contra a operadora', () => {
    const exposicao = exposicaoDoPedido(
      pedido({ formaDePagamento: 'Cartão', condicaoDePagamento: '3x', vencimentosEmDias: [] }),
    );
    expect(exposicao.natureza).toBe('CARTAO');
    expect(exposicao.exposicaoCentavos).toBe(0);
  });

  it('boleto a vista ainda e credito: o cliente paga depois de receber', () => {
    const exposicao = exposicaoDoPedido(
      pedido({ condicaoDePagamento: 'À vista', vencimentosEmDias: [0] }),
    );
    expect(exposicao.natureza).toBe('A_PRAZO');
    expect(exposicao.exposicaoCentavos).toBe(300_000);
  });

  it('consignacao conta como exposicao integral', () => {
    const exposicao = exposicaoDoPedido(pedido({ tipo: 'CONSIGNACAO' }));
    expect(exposicao.natureza).toBe('CONSIGNACAO');
    expect(exposicao.exposicaoCentavos).toBe(300_000);
  });
});

describe('vencimentosDoPedido', () => {
  it('usa os dias gravados, em ordem', () => {
    expect(
      vencimentosDoPedido({ vencimentosEmDias: [42, 28, 35], condicaoDePagamento: '' }),
    ).toEqual([28, 35, 42]);
  });

  it('le a condicao dos pedidos antigos', () => {
    expect(
      vencimentosDoPedido({ vencimentosEmDias: [], condicaoDePagamento: 'Cheque 14/21' }),
    ).toEqual([14, 21]);
    expect(vencimentosDoPedido({ vencimentosEmDias: [], condicaoDePagamento: '3x' })).toEqual([
      30, 60, 90,
    ]);
    expect(vencimentosDoPedido({ vencimentosEmDias: [], condicaoDePagamento: 'À vista' })).toEqual([
      0,
    ]);
  });
});
