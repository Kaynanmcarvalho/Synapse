import { describe, expect, it } from 'vitest';
import type { PedidoDoCalendario, TituloGravado } from './parcelas';
import {
  calendarioDoPedido,
  descricaoDoParcelamento,
  dividirEmParcelas,
  prazoMedioDaCondicao,
  simularParcelas,
} from './parcelas';

const pedido = (dados: Partial<PedidoDoCalendario> = {}): PedidoDoCalendario => ({
  tipo: 'VENDA',
  formaDePagamento: 'Boleto',
  condicaoDePagamento: '28/35/42 dias',
  vencimentosEmDias: [28, 35, 42],
  totalCentavos: 100_000,
  situacao: 'AGUARDANDO_ANALISE',
  nota: null,
  ...dados,
});

const titulo = (dados: Partial<TituloGravado> = {}): TituloGravado => ({
  id: 't1',
  numeroParcela: 1,
  totalDeParcelas: 3,
  vencimento: '2026-10-11',
  valorOriginalCentavos: 33_334,
  status: 'ABERTO',
  ...dados,
});

describe('dividirEmParcelas', () => {
  it('distribui o centavo que sobra da primeira parcela em diante e fecha o total', () => {
    expect(dividirEmParcelas(100_000, 3)).toEqual([33_334, 33_333, 33_333]);
    expect(dividirEmParcelas(100, 7)).toEqual([15, 15, 14, 14, 14, 14, 14]);
    expect(dividirEmParcelas(100, 7).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('simularParcelas', () => {
  it('conta os dias da condicao a partir da data-base', () => {
    const calendario = simularParcelas(pedido(), '2026-09-13');
    expect(calendario.origem).toBe('SIMULACAO');
    expect(calendario.dataBase).toBe('2026-09-13');
    expect(
      calendario.parcelas.map((p) => [p.numero, p.dias, p.vencimento, p.valorCentavos]),
    ).toEqual([
      [1, 28, '2026-10-11', 33_334],
      [2, 35, '2026-10-18', 33_333],
      [3, 42, '2026-10-25', 33_333],
    ]);
  });

  it('mudar a data-base desloca todos os vencimentos', () => {
    const hoje = simularParcelas(pedido(), '2026-09-13');
    const amanha = simularParcelas(pedido(), '2026-09-14');
    expect(amanha.parcelas.map((p) => p.vencimento)).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(amanha.parcelas.map((p) => p.valorCentavos)).toEqual(
      hoje.parcelas.map((p) => p.valorCentavos),
    );
  });

  it('atravessa virada de mes e de ano sem depender do fuso', () => {
    const calendario = simularParcelas(
      pedido({ vencimentosEmDias: [30], condicaoDePagamento: '30' }),
      '2026-12-15',
    );
    expect(calendario.parcelas[0]?.vencimento).toBe('2027-01-14');
  });

  it('com entrada, parcela so o saldo financiado', () => {
    const calendario = simularParcelas(pedido({ entradaCentavos: 40_000 }), '2026-09-13');
    expect(calendario.entradaCentavos).toBe(40_000);
    expect(calendario.financiadoCentavos).toBe(60_000);
    expect(calendario.parcelas.map((p) => p.valorCentavos)).toEqual([20_000, 20_000, 20_000]);
  });

  it('troca nao gera parcela', () => {
    expect(simularParcelas(pedido({ tipo: 'TROCA' }), '2026-09-13').parcelas).toEqual([]);
  });
});

describe('calendarioDoPedido', () => {
  it('antes do faturamento, simula a partir de hoje', () => {
    const calendario = calendarioDoPedido(pedido(), [], '2026-09-13');
    expect(calendario.origem).toBe('SIMULACAO');
    expect(calendario.parcelas[0]?.vencimento).toBe('2026-10-11');
  });

  it('depois do faturamento, os vencimentos sao os gravados e nao mudam com o dia', () => {
    const faturado = pedido({
      situacao: 'FATURADO',
      nota: { numero: 4388, serie: 1, chaveDeAcesso: null, emitidaEm: '2026-08-20T10:00:00.000Z' },
    });
    const titulos = [
      titulo({
        id: 't2',
        numeroParcela: 2,
        vencimento: '2026-09-24',
        valorOriginalCentavos: 33_333,
      }),
      titulo({ id: 't1', numeroParcela: 1, vencimento: '2026-09-17' }),
    ];
    const hoje = calendarioDoPedido(faturado, titulos, '2026-09-13');
    const mesQueVem = calendarioDoPedido(faturado, titulos, '2026-10-13');

    expect(hoje).toEqual(mesQueVem);
    expect(hoje.origem).toBe('TITULOS');
    expect(hoje.dataBase).toBeNull();
    expect(hoje.parcelas.map((p) => [p.tituloId, p.vencimento, p.dias])).toEqual([
      ['t1', '2026-09-17', 28],
      ['t2', '2026-09-24', 35],
    ]);
  });

  it('pedido com nota e sem titulo nao volta a simular', () => {
    const faturado = pedido({
      nota: { numero: 1, serie: 1, chaveDeAcesso: null, emitidaEm: '2026-08-20T10:00:00.000Z' },
    });
    const calendario = calendarioDoPedido(faturado, [], '2026-09-13');
    expect(calendario.origem).toBe('TITULOS');
    expect(calendario.parcelas).toEqual([]);
  });

  it('titulo cancelado ou renegociado sai do calendario', () => {
    const faturado = pedido({ situacao: 'FATURADO' });
    const calendario = calendarioDoPedido(
      faturado,
      [titulo({ status: 'CANCELADO' }), titulo({ id: 't9', status: 'RENEGOCIADO' })],
      '2026-09-13',
    );
    expect(calendario.parcelas).toEqual([]);
  });
});

describe('descricao e prazo medio', () => {
  it('fala a condicao como o balcao fala', () => {
    expect(descricaoDoParcelamento([28, 35, 42])).toBe('28 / 35 / 42');
    expect(descricaoDoParcelamento([0])).toBe('À vista');
    expect(prazoMedioDaCondicao([28, 35, 42])).toBe(35);
    expect(prazoMedioDaCondicao([])).toBe(0);
  });
});
