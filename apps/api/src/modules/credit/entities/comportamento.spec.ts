import { PARAMETROS_PADRAO } from '@synapse/validation';
import { CLIENTE, HOJE, liquidacao, pago, pedido, titulo } from '../testing/fixtures';
import {
  comparacaoComHistorico,
  comportamentoFinanceiro,
  maiorExposicaoHistorica,
  pontualidadeRecente,
  titulosLiquidados,
} from './comportamento';

const comportamento = (
  titulos = [pago('a', '2026-09-01', -6), pago('b', '2026-08-01', 0), pago('c', '2026-07-01', 4)],
  pedidos = [pedido({ situacao: 'FATURADO' })],
) =>
  comportamentoFinanceiro({
    customerId: CLIENTE,
    titulos,
    pedidos,
    parametros: PARAMETROS_PADRAO,
    hoje: HOJE,
    identificar: (titulo) => titulo.id,
  });

describe('pontualidade', () => {
  it('separa antecipado, no vencimento e em atraso, por titulo', () => {
    const { pontualidade } = comportamento().janelas['12M'];
    expect(pontualidade).toMatchObject({
      titulosLiquidados: 3,
      antecipados: 1,
      noVencimento: 1,
      emAtraso: 1,
      percentualNoPrazo: 66.7,
    });
  });

  it('atraso medio conta pagamento em dia como zero; maior atraso e o pior', () => {
    const { pontualidade } = comportamento().janelas['12M'];
    expect(pontualidade.atrasoMedioDias).toBe(1.3);
    expect(pontualidade.maiorAtrasoDias).toBe(4);
  });

  it('titulo pago metade antes e metade depois do vencimento foi pago com atraso', () => {
    const parcial = titulo({
      id: 'p',
      vencimento: '2026-08-10',
      valorOriginalCentavos: 2_000,
      status: 'QUITADO',
      liquidacoes: [
        liquidacao({ id: '1', data: '2026-08-05', valorCentavos: 800 }),
        liquidacao({ id: '2', data: '2026-08-15', valorCentavos: 1_200 }),
      ],
    });
    const [liquidado] = titulosLiquidados([parcial], CLIENTE);
    expect(liquidado?.quitadoEm).toBe('2026-08-15');
    expect(liquidado?.dias).toBe(5);
  });

  it('titulo so parcialmente pago ainda nao conta como liquidado', () => {
    const aberto = titulo({
      valorOriginalCentavos: 2_000,
      status: 'PARCIAL',
      liquidacoes: [liquidacao({ valorCentavos: 800 })],
    });
    expect(titulosLiquidados([aberto], CLIENTE)).toEqual([]);
  });

  it('janelas recortam pela data em que o saldo zerou', () => {
    const resultado = comportamento([
      pago('recente', '2026-09-01', 0),
      pago('antigo', '2026-03-01', 0),
    ]);
    expect(resultado.janelas['90D'].pontualidade.titulosLiquidados).toBe(1);
    expect(resultado.janelas['12M'].pontualidade.titulosLiquidados).toBe(2);
  });

  it('pago na janela soma as liquidacoes, inclusive as parciais', () => {
    const resultado = comportamento([
      titulo({
        status: 'PARCIAL',
        liquidacoes: [liquidacao({ data: '2026-09-05', valorCentavos: 800 })],
      }),
    ]);
    expect(resultado.janelas['90D'].pontualidade.pagoCentavos).toBe(800);
  });
});

describe('historico insuficiente', () => {
  it('pouca amostra nao vira "bom pagador"', () => {
    const resultado = comportamento([pago('a', '2026-09-01', 0), pago('b', '2026-08-01', 0)]);
    expect(resultado.titulosConsiderados).toBe(2);
    expect(resultado.historicoSuficiente).toBe(false);
    expect(resultado.janelas['12M'].pontualidade.percentualNoPrazo).toBe(100);
  });

  it('com o minimo de titulos, o historico e suficiente', () => {
    const cinco = ['a', 'b', 'c', 'd', 'e'].map((id) => pago(id, '2026-08-01', 0));
    expect(comportamento(cinco).historicoSuficiente).toBe(true);
  });
});

describe('compras', () => {
  const pedidos = [
    pedido({
      id: '1',
      situacao: 'FATURADO',
      totalCentavos: 100_000,
      prazoMedioEmDias: 28,
      enviadoEm: '2026-09-01T10:00:00Z',
    }),
    pedido({
      id: '2',
      situacao: 'APROVADO',
      totalCentavos: 200_000,
      prazoMedioEmDias: 42,
      enviadoEm: '2026-08-20T10:00:00Z',
    }),
    pedido({
      id: '3',
      situacao: 'FATURADO',
      totalCentavos: 300_000,
      prazoMedioEmDias: 35,
      enviadoEm: '2026-03-01T10:00:00Z',
    }),
    // Nao sao compra: reprovado, bonificacao e o que ainda esta em analise.
    pedido({ id: '4', situacao: 'REPROVADO', totalCentavos: 999_999 }),
    pedido({ id: '5', situacao: 'FATURADO', tipo: 'BONIFICACAO', totalCentavos: 999_999 }),
    pedido({ id: '6', situacao: 'AGUARDANDO_ANALISE', totalCentavos: 999_999 }),
  ];

  it('ticket medio e prazo medio por janela', () => {
    const resultado = comportamento([], pedidos);
    expect(resultado.janelas['90D'].compras).toMatchObject({
      pedidos: 2,
      valorCentavos: 300_000,
      ticketMedioCentavos: 150_000,
      prazoMedioDias: 35,
    });
    expect(resultado.janelas['12M'].compras.pedidos).toBe(3);
    expect(resultado.janelas['12M'].compras.prazoMedioDias).toBe(35);
    expect(resultado.ultimaCompraEm).toBe('2026-09-01');
  });

  it('prazo medio so considera o que foi a prazo', () => {
    const resultado = comportamento(
      [],
      [
        pedido({
          id: 'pix',
          situacao: 'FATURADO',
          formaDePagamento: 'PIX',
          condicaoDePagamento: 'À vista',
          vencimentosEmDias: [],
          prazoMedioEmDias: 0,
        }),
        pedido({ id: 'bol', situacao: 'FATURADO', prazoMedioEmDias: 30 }),
      ],
    );
    expect(resultado.janelas['12M'].compras.prazoMedioDias).toBe(30);
    expect(resultado.janelas['12M'].compras.pedidosAPrazo).toBe(1);
  });

  it('compara o pedido com o habitual so com amostra', () => {
    const resultado = comportamento([], pedidos.slice(0, 3));
    const semAmostra = comparacaoComHistorico(
      pedido({ totalCentavos: 360_000 }),
      resultado,
      PARAMETROS_PADRAO,
    );
    expect(semAmostra.ticketMedioCentavos).toBeNull();
    expect(semAmostra.pedidosNoTicket).toBe(2);

    const comAmostra = comparacaoComHistorico(
      pedido({ totalCentavos: 360_000, prazoMedioEmDias: 49 }),
      resultado,
      {
        ...PARAMETROS_PADRAO,
        minimoDePedidosParaComparar: 2,
      },
    );
    expect(comAmostra.ticketMedioCentavos).toBe(150_000);
    expect(comAmostra.razaoSobreTicket).toBe(2.4);
    expect(comAmostra.prazoMedioHistoricoDias).toBe(35);
    expect(comAmostra.diferencaDePrazoDias).toBe(14);
  });

  it('bonificacao e troca nao se comparam com o ticket de compra', () => {
    const resultado = comportamento([], pedidos.slice(0, 3));
    const bonificacao = comparacaoComHistorico(
      pedido({ tipo: 'BONIFICACAO', totalCentavos: 16_536 }),
      resultado,
      {
        ...PARAMETROS_PADRAO,
        minimoDePedidosParaComparar: 2,
      },
    );
    expect(bonificacao).toMatchObject({
      aplicavel: false,
      ticketMedioCentavos: null,
      razaoSobreTicket: null,
    });
  });
});

describe('maiorExposicaoHistorica', () => {
  it('refaz o saldo dia a dia pelos titulos', () => {
    expect(
      maiorExposicaoHistorica([
        titulo({
          id: 'a',
          criadoEm: '2026-01-01T00:00:00Z',
          valorOriginalCentavos: 500,
          liquidacoes: [liquidacao({ data: '2026-02-01', valorCentavos: 500 })],
        }),
        titulo({ id: 'b', criadoEm: '2026-01-15T00:00:00Z', valorOriginalCentavos: 300 }),
        titulo({ id: 'c', criadoEm: '2026-03-01T00:00:00Z', valorOriginalCentavos: 100 }),
      ]),
    ).toBe(800);
  });

  it('sem titulo nao ha exposicao historica', () => {
    expect(maiorExposicaoHistorica([])).toBeNull();
  });
});

describe('pontualidadeRecente', () => {
  it('olha os ultimos liquidados, do mais recente para tras', () => {
    const titulos = [
      pago('a', '2026-09-01', 0),
      pago('b', '2026-08-01', 3),
      pago('c', '2026-07-01', -1),
    ];
    expect(pontualidadeRecente(titulos, CLIENTE, 2)).toEqual({ considerados: 2, noPrazo: 1 });
  });
});
