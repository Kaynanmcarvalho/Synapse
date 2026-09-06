import type { Liquidacao, Titulo } from '@synapse/types';
import {
  agruparPorFaixa,
  contaNoSaldo,
  diasDeAtraso,
  faixaDe,
  inadimplenciaPorCliente,
  projetarFluxoDeCaixa,
  registrarLiquidacao,
  renegociar,
  saldoCentavos,
  statusDe,
  totalLiquidadoCentavos,
} from './titulo';

const HOJE = '2026-06-15';

const titulo = (extra: Partial<Titulo> = {}): Titulo =>
  ({
    id: 'T-1',
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    tipo: 'RECEBER',
    descricao: 'Pedido 1001',
    customerId: 'cliente-1',
    fornecedorId: null,
    orderId: 'pedido-1001',
    numeroParcela: 1,
    totalDeParcelas: 1,
    valorOriginalCentavos: 100_000,
    vencimento: '2026-06-30',
    status: 'ABERTO',
    liquidacoes: [],
    centroDeCustoId: null,
    categoriaId: null,
    renegociadoDe: null,
    renegociadoPara: [],
    criadoEm: '2026-06-01T00:00:00.000Z',
    criadoPor: 'uid-1',
    ...extra,
  }) as Titulo;

const pagamento = (valorCentavos: number, extra: Partial<Liquidacao> = {}): Liquidacao => ({
  id: `L-${valorCentavos}`,
  data: HOJE,
  valorCentavos,
  forma: 'PIX',
  observacao: null,
  referenciaBancaria: null,
  registradoPor: 'uid-1' as Liquidacao['registradoPor'],
  registradoEm: `${HOJE}T10:00:00.000Z`,
  ...extra,
});

// c24-1: recebimento parcial mantendo o saldo correto e rastreavel.
describe('recebimento parcial', () => {
  it('desconta do saldo e marca o titulo como parcial', () => {
    const parcial = registrarLiquidacao(titulo(), pagamento(30_000), HOJE);

    expect(saldoCentavos(parcial)).toBe(70_000);
    expect(totalLiquidadoCentavos(parcial)).toBe(30_000);
    expect(parcial.status).toBe('PARCIAL');
  });

  it('acumula varios recebimentos ate quitar', () => {
    let atual = registrarLiquidacao(titulo(), pagamento(30_000), HOJE);
    atual = registrarLiquidacao(atual, pagamento(50_000), HOJE);
    expect(atual.status).toBe('PARCIAL');

    atual = registrarLiquidacao(atual, pagamento(20_000), HOJE);

    expect(saldoCentavos(atual)).toBe(0);
    expect(atual.status).toBe('QUITADO');
  });

  // Rastreavel quer dizer isto: cada movimento fica, com quem, quando e como.
  it('guarda cada movimento em vez de so mexer num numero', () => {
    let atual = registrarLiquidacao(titulo(), pagamento(30_000, { forma: 'DINHEIRO' }), HOJE);
    atual = registrarLiquidacao(
      atual,
      pagamento(20_000, { forma: 'BOLETO', referenciaBancaria: '000123' }),
      HOJE,
    );

    expect(atual.liquidacoes).toHaveLength(2);
    expect(atual.liquidacoes.map((l) => l.forma)).toEqual(['DINHEIRO', 'BOLETO']);
    expect(atual.liquidacoes[1]?.referenciaBancaria).toBe('000123');
  });

  it('recusa receber mais do que o saldo, em vez de gerar troco', () => {
    const parcial = registrarLiquidacao(titulo(), pagamento(30_000), HOJE);
    expect(() => registrarLiquidacao(parcial, pagamento(80_000), HOJE)).toThrow(/excede o saldo/);
  });

  it('recusa valor zero ou negativo', () => {
    expect(() => registrarLiquidacao(titulo(), pagamento(0), HOJE)).toThrow(/positivo/);
    expect(() => registrarLiquidacao(titulo(), pagamento(-100), HOJE)).toThrow(/positivo/);
  });

  it('recusa liquidacao em titulo cancelado', () => {
    expect(() => registrarLiquidacao(titulo({ status: 'CANCELADO' }), pagamento(10), HOJE)).toThrow(
      /cancelado/,
    );
  });

  it('manda lancar no titulo novo quando o original ja foi renegociado', () => {
    expect(() =>
      registrarLiquidacao(titulo({ status: 'RENEGOCIADO' }), pagamento(10), HOJE),
    ).toThrow(/título que o substituiu/);
  });
});

// c24-2: renegociacao vinculada ao titulo original.
describe('renegociacao', () => {
  const parcelas = [
    { id: 'T-2', valorCentavos: 55_000, vencimento: '2026-07-30' },
    { id: 'T-3', valorCentavos: 55_000, vencimento: '2026-08-30' },
  ];

  it('nao apaga a divida original: marca e diz para onde ela foi', () => {
    const { original } = renegociar(titulo(), parcelas, `${HOJE}T10:00:00.000Z`, 'uid-1' as never);

    expect(original.status).toBe('RENEGOCIADO');
    expect(original.renegociadoPara).toEqual(['T-2', 'T-3']);
    expect(original.valorOriginalCentavos).toBe(100_000);
    expect(original.liquidacoes).toEqual([]);
  });

  it('cada titulo novo aponta de volta para o original', () => {
    const { novos } = renegociar(titulo(), parcelas, `${HOJE}T10:00:00.000Z`, 'uid-1' as never);

    expect(novos).toHaveLength(2);
    expect(novos.every((n) => n.renegociadoDe === 'T-1')).toBe(true);
    expect(novos.map((n) => n.numeroParcela)).toEqual([1, 2]);
    expect(novos.every((n) => n.totalDeParcelas === 2)).toBe(true);
    expect(novos.every((n) => n.status === 'ABERTO' && n.liquidacoes.length === 0)).toBe(true);
  });

  it('renegocia so o saldo, e nao o valor cheio, quando ja houve pagamento', () => {
    const parcial = registrarLiquidacao(titulo(), pagamento(40_000), HOJE);
    expect(saldoCentavos(parcial)).toBe(60_000);

    const { novos } = renegociar(
      parcial,
      [{ id: 'T-2', valorCentavos: 60_000, vencimento: '2026-07-30' }],
      `${HOJE}T10:00:00.000Z`,
      'uid-1' as never,
    );

    expect(novos[0]?.valorOriginalCentavos).toBe(60_000);
  });

  // Juros de renegociacao sao a regra: total maior que o saldo passa.
  it('aceita total acima do saldo', () => {
    const { novos } = renegociar(
      titulo(),
      [{ id: 'T-2', valorCentavos: 115_000, vencimento: '2026-07-30' }],
      `${HOJE}T10:00:00.000Z`,
      'uid-1' as never,
    );
    expect(novos[0]?.valorOriginalCentavos).toBe(115_000);
  });

  it('recusa total abaixo do saldo, que seria perdao de divida disfarcado', () => {
    expect(() =>
      renegociar(
        titulo(),
        [{ id: 'T-2', valorCentavos: 50_000, vencimento: '2026-07-30' }],
        `${HOJE}T10:00:00.000Z`,
        'uid-1' as never,
      ),
    ).toThrow(/perdão de dívida é outra operação/);
  });

  it('recusa renegociar duas vezes, sem parcela, ou titulo ja quitado', () => {
    const agora = `${HOJE}T10:00:00.000Z`;
    expect(() =>
      renegociar(titulo({ status: 'RENEGOCIADO' }), parcelas, agora, 'x' as never),
    ).toThrow(/já foi renegociado/);
    expect(() => renegociar(titulo(), [], agora, 'x' as never)).toThrow(/ao menos uma parcela/);

    const quitado = registrarLiquidacao(titulo(), pagamento(100_000), HOJE);
    expect(() => renegociar(quitado, parcelas, agora, 'x' as never)).toThrow(/sem saldo/);
  });

  // O original renegociado sai da conta: soma-lo junto contaria a divida duas vezes.
  it('tira o original do fluxo de caixa e poe os novos no lugar', () => {
    const { original, novos } = renegociar(
      titulo(),
      parcelas,
      `${HOJE}T10:00:00.000Z`,
      'uid-1' as never,
    );

    expect(contaNoSaldo(original)).toBe(false);
    expect(novos.every(contaNoSaldo)).toBe(true);

    const faixas = agruparPorFaixa([original, ...novos], HOJE);
    const total = faixas.reduce((soma, f) => soma + f.saldoCentavos, 0);
    expect(total).toBe(110_000);
  });
});

describe('status e atraso', () => {
  it('marca vencido depois da data', () => {
    expect(statusDe(titulo({ vencimento: '2026-06-01' }), HOJE)).toBe('VENCIDO');
    expect(diasDeAtraso(titulo({ vencimento: '2026-06-01' }), HOJE)).toBe(14);
  });

  it('nao marca vencido no proprio dia', () => {
    expect(statusDe(titulo({ vencimento: HOJE }), HOJE)).toBe('ABERTO');
    expect(diasDeAtraso(titulo({ vencimento: HOJE }), HOJE)).toBe(0);
  });

  it('titulo quitado nao fica em atraso, mesmo vencido', () => {
    const quitado = registrarLiquidacao(
      titulo({ vencimento: '2026-06-01' }),
      pagamento(100_000),
      HOJE,
    );
    expect(statusDe(quitado, HOJE)).toBe('QUITADO');
    expect(diasDeAtraso(quitado, HOJE)).toBe(0);
  });
});

// c24-3: dashboard por faixa de vencimento.
describe('faixas de vencimento', () => {
  it.each([
    ['2026-06-01', 'VENCIDOS'],
    ['2026-06-15', 'HOJE'],
    ['2026-06-20', 'ATE_7_DIAS'],
    ['2026-06-22', 'ATE_7_DIAS'],
    ['2026-07-10', 'ATE_30_DIAS'],
    ['2026-09-01', 'DEPOIS'],
  ])('vencimento %s cai em %s', (vencimento, esperada) => {
    expect(faixaDe(titulo({ vencimento }), HOJE)).toBe(esperada);
  });

  it('soma quantidade e saldo por faixa, ignorando quitado e cancelado', () => {
    const quitado = registrarLiquidacao(
      titulo({ id: 'q', vencimento: '2026-06-20' }),
      pagamento(100_000),
      HOJE,
    );
    const faixas = agruparPorFaixa(
      [
        titulo({ id: 'a', vencimento: '2026-06-01', valorOriginalCentavos: 20_000 }),
        titulo({ id: 'b', vencimento: '2026-06-20', valorOriginalCentavos: 30_000 }),
        titulo({ id: 'c', vencimento: '2026-06-21', valorOriginalCentavos: 10_000 }),
        titulo({ id: 'd', vencimento: '2026-06-25', status: 'CANCELADO' }),
        quitado,
      ],
      HOJE,
    );

    const porFaixa = new Map(faixas.map((f) => [f.faixa, f]));
    expect(porFaixa.get('VENCIDOS')).toMatchObject({ quantidade: 1, saldoCentavos: 20_000 });
    expect(porFaixa.get('ATE_7_DIAS')).toMatchObject({ quantidade: 2, saldoCentavos: 40_000 });
    expect(porFaixa.get('HOJE')?.quantidade).toBe(0);
  });

  it('usa o saldo, e nao o valor cheio, no titulo parcial', () => {
    const parcial = registrarLiquidacao(
      titulo({ vencimento: '2026-06-20' }),
      pagamento(60_000),
      HOJE,
    );
    const faixas = agruparPorFaixa([parcial], HOJE);
    expect(faixas.find((f) => f.faixa === 'ATE_7_DIAS')?.saldoCentavos).toBe(40_000);
  });
});

// c24-4: indicador de inadimplencia por cliente.
describe('inadimplencia por cliente', () => {
  it('soma o vencido por cliente e ordena pelo maior saldo', () => {
    const resultado = inadimplenciaPorCliente(
      [
        titulo({
          id: 'a',
          customerId: 'c1' as never,
          vencimento: '2026-06-01',
          valorOriginalCentavos: 10_000,
        }),
        titulo({
          id: 'b',
          customerId: 'c1' as never,
          vencimento: '2026-05-01',
          valorOriginalCentavos: 5_000,
        }),
        titulo({
          id: 'c',
          customerId: 'c2' as never,
          vencimento: '2026-06-10',
          valorOriginalCentavos: 90_000,
        }),
        titulo({ id: 'd', customerId: 'c3' as never, vencimento: '2026-07-10' }),
      ],
      HOJE,
    );

    expect(resultado.map((r) => r.customerId)).toEqual(['c2', 'c1']);
    expect(resultado[1]).toMatchObject({
      titulosVencidos: 2,
      saldoVencidoCentavos: 15_000,
      diasDeAtrasoMaximo: 45,
    });
  });

  it('ignora titulo a pagar, que nao e inadimplencia de cliente', () => {
    const resultado = inadimplenciaPorCliente(
      [titulo({ tipo: 'PAGAR', customerId: null, vencimento: '2026-06-01' })],
      HOJE,
    );
    expect(resultado).toEqual([]);
  });
});

// c24-7: fluxo de caixa projetado.
describe('fluxo de caixa projetado', () => {
  it('acumula entradas e saidas dia a dia a partir do saldo inicial', () => {
    const projecao = projetarFluxoDeCaixa(
      [
        titulo({
          id: 'a',
          tipo: 'RECEBER',
          vencimento: '2026-06-16',
          valorOriginalCentavos: 50_000,
        }),
        titulo({ id: 'b', tipo: 'PAGAR', vencimento: '2026-06-17', valorOriginalCentavos: 20_000 }),
      ],
      '2026-06-15',
      '2026-06-18',
      10_000,
    );

    expect(projecao).toHaveLength(4);
    expect(projecao[0]).toMatchObject({ data: '2026-06-15', saldoAcumuladoCentavos: 10_000 });
    expect(projecao[1]).toMatchObject({ entradasCentavos: 50_000, saldoAcumuladoCentavos: 60_000 });
    expect(projecao[2]).toMatchObject({ saidasCentavos: 20_000, saldoAcumuladoCentavos: 40_000 });
    expect(projecao[3]?.saldoAcumuladoCentavos).toBe(40_000);
  });

  it('mostra o saldo ficando negativo, que e o ponto de projetar', () => {
    const projecao = projetarFluxoDeCaixa(
      [titulo({ tipo: 'PAGAR', vencimento: '2026-06-16', valorOriginalCentavos: 80_000 })],
      '2026-06-15',
      '2026-06-16',
      10_000,
    );
    expect(projecao[1]?.saldoAcumuladoCentavos).toBe(-70_000);
  });

  it('ignora titulo fora da janela e recusa periodo invertido', () => {
    const projecao = projetarFluxoDeCaixa(
      [titulo({ vencimento: '2026-12-01' })],
      '2026-06-15',
      '2026-06-16',
      0,
    );
    expect(projecao.every((d) => d.entradasCentavos === 0)).toBe(true);
    expect(() => projetarFluxoDeCaixa([], '2026-06-16', '2026-06-15', 0)).toThrow(/anterior/);
  });
});
