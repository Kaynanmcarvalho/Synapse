import type { BankTransaction, Titulo, UserId } from '@synapse/types';
import {
  conciliarAutomatico,
  conciliarManual,
  marcarDivergencia,
  relatorioDeConciliacao,
} from './conciliacao';

const AGORA = '2026-06-15T12:00:00.000Z';
const OPERADOR = 'uid-operador' as UserId;

const titulo = (extra: Partial<Titulo> = {}): Titulo =>
  ({
    id: 'T-1',
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    tipo: 'RECEBER',
    descricao: 'Pedido 1001',
    customerId: 'cliente-1',
    fornecedorId: null,
    orderId: null,
    numeroParcela: 1,
    totalDeParcelas: 1,
    valorOriginalCentavos: 50_000,
    vencimento: '2026-06-10',
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

const lancamento = (extra: Partial<BankTransaction> = {}): BankTransaction => ({
  id: 'L-1',
  data: '2026-06-11',
  tipo: 'CREDITO',
  valorCentavos: 50_000,
  descricao: 'Crédito boleto',
  documento: null,
  referencia: null,
  ...extra,
});

describe('conciliacao automatica', () => {
  // c25-1: identificador e certeza — e o que mandamos no titulo voltando.
  it('casa pelo identificador mesmo com valor e data diferentes', () => {
    const resultado = conciliarAutomatico(
      [lancamento({ referencia: 'T-1', valorCentavos: 49_000, data: '2026-07-30' })],
      [titulo()],
      AGORA,
    );

    expect(resultado.conciliados).toHaveLength(1);
    expect(resultado.conciliados[0]).toMatchObject({
      lancamentoId: 'L-1',
      tituloId: 'T-1',
      criterio: 'IDENTIFICADOR',
    });
    expect(resultado.pendencias).toHaveLength(0);
  });

  it('casa por valor e data dentro da tolerancia', () => {
    const resultado = conciliarAutomatico([lancamento()], [titulo()], AGORA);

    expect(resultado.conciliados[0]?.criterio).toBe('VALOR_E_DATA');
    expect(resultado.pendencias).toHaveLength(0);
  });

  it('nao casa fora da tolerancia de dias', () => {
    const resultado = conciliarAutomatico([lancamento({ data: '2026-06-20' })], [titulo()], AGORA);

    expect(resultado.conciliados).toHaveLength(0);
    expect(resultado.pendencias).toHaveLength(2);
  });

  // Duas contas de R$ 500 no mesmo dia sao indistinguiveis: chutar erraria em
  // silencio, entao as duas ficam pendentes para alguem decidir.
  it('nao chuta quando ha ambiguidade de valor e data', () => {
    const resultado = conciliarAutomatico(
      [lancamento({ id: 'L-1' }), lancamento({ id: 'L-2' })],
      [titulo({ id: 'T-1' }), titulo({ id: 'T-2' })],
      AGORA,
    );

    expect(resultado.conciliados).toHaveLength(0);
    expect(resultado.pendencias).toHaveLength(4);
  });

  // O identificador roda antes de proposito: se o palpite rodasse primeiro,
  // gastaria o lancamento certo num casamento errado.
  it('o identificador tem prioridade sobre o palpite por valor', () => {
    const resultado = conciliarAutomatico(
      [lancamento({ id: 'L-1', referencia: 'T-2' })],
      [titulo({ id: 'T-1' }), titulo({ id: 'T-2' })],
      AGORA,
    );

    expect(resultado.conciliados).toHaveLength(1);
    expect(resultado.conciliados[0]).toMatchObject({ tituloId: 'T-2', criterio: 'IDENTIFICADOR' });
  });

  it('nao usa o mesmo titulo em dois lancamentos', () => {
    const resultado = conciliarAutomatico(
      [lancamento({ id: 'L-1', referencia: 'T-1' }), lancamento({ id: 'L-2', referencia: 'T-1' })],
      [titulo({ id: 'T-1' })],
      AGORA,
    );

    expect(resultado.conciliados).toHaveLength(1);
    expect(resultado.pendencias.filter((p) => p.lado === 'BANCO')).toHaveLength(1);
  });

  it('ignora titulo quitado, cancelado e renegociado', () => {
    const resultado = conciliarAutomatico(
      [],
      [titulo({ id: 'a', status: 'CANCELADO' }), titulo({ id: 'b', status: 'RENEGOCIADO' })],
      AGORA,
    );

    expect(resultado.pendencias).toHaveLength(0);
  });

  // c25-3: a lista de pendencias nao some sozinha.
  it('registra os dois lados do que sobrou', () => {
    const resultado = conciliarAutomatico(
      [lancamento({ id: 'L-9', valorCentavos: 12_345, descricao: 'Tarifa' })],
      [titulo({ id: 'T-9', valorOriginalCentavos: 777, descricao: 'Boleto 9' })],
      AGORA,
    );

    const banco = resultado.pendencias.find((p) => p.lado === 'BANCO');
    const sistema = resultado.pendencias.find((p) => p.lado === 'SISTEMA');

    expect(banco).toMatchObject({
      valorCentavos: 12_345,
      descricao: 'Tarifa',
      situacao: 'PENDENTE',
    });
    expect(sistema).toMatchObject({ tituloId: 'T-9', valorCentavos: 777, situacao: 'PENDENTE' });
  });
});

// c25-2 e c25-6.
describe('conciliacao manual', () => {
  const pendentes = conciliarAutomatico(
    [lancamento({ id: 'L-1', valorCentavos: 30_000 })],
    [titulo({ id: 'T-1', valorOriginalCentavos: 50_000 })],
    AGORA,
  ).pendencias;

  it('casa o que sobrou e guarda quem decidiu', () => {
    const { item, pendencias } = conciliarManual(pendentes, 'L-1', 'T-1', OPERADOR, AGORA);

    expect(item).toMatchObject({ criterio: 'MANUAL', conciliadoPor: OPERADOR });
    expect(pendencias).toHaveLength(0);
  });

  it('recusa lancamento ou titulo que nao esta pendente', () => {
    expect(() => conciliarManual(pendentes, 'L-999', 'T-1', OPERADOR, AGORA)).toThrow(
      /L-999 não está pendente/,
    );
    expect(() => conciliarManual(pendentes, 'L-1', 'T-999', OPERADOR, AGORA)).toThrow(
      /T-999 não está pendente/,
    );
  });
});

// c25-4: diferenca marcada nao pode sumir da tela.
describe('marcar divergencia', () => {
  const pendentes = conciliarAutomatico([lancamento({ id: 'L-1' })], [], AGORA).pendencias;

  it('mantem a pendencia na lista, mudando a situacao e guardando o motivo', () => {
    const depois = marcarDivergencia(pendentes, 'banco:L-1', 'Tarifa não lançada', OPERADOR);

    expect(depois).toHaveLength(1);
    expect(depois[0]).toMatchObject({
      situacao: 'DIVERGENTE',
      motivoDaDivergencia: 'Tarifa não lançada',
      marcadoPor: OPERADOR,
    });
  });

  it('exige um motivo', () => {
    expect(() => marcarDivergencia(pendentes, 'banco:L-1', '   ', OPERADOR)).toThrow(/motivo/);
  });

  it('recusa pendencia inexistente', () => {
    expect(() => marcarDivergencia(pendentes, 'banco:L-99', 'x', OPERADOR)).toThrow(
      /não encontrada/,
    );
  });
});

// c25-5.
describe('relatorio de conciliacao', () => {
  it('conta por criterio e soma o que ficou pendente', () => {
    const resultado = conciliarAutomatico(
      [
        lancamento({ id: 'L-1', referencia: 'T-1' }),
        lancamento({ id: 'L-2', valorCentavos: 20_000, data: '2026-06-12' }),
        lancamento({ id: 'L-3', valorCentavos: 999, descricao: 'Tarifa' }),
      ],
      [
        titulo({ id: 'T-1' }),
        titulo({ id: 'T-2', valorOriginalCentavos: 20_000, vencimento: '2026-06-12' }),
        titulo({ id: 'T-3', valorOriginalCentavos: 4_321 }),
      ],
      AGORA,
    );

    const relatorio = relatorioDeConciliacao(resultado, '2026-06-01', '2026-06-30');

    expect(relatorio).toMatchObject({
      conciliadosPorIdentificador: 1,
      conciliadosPorValorEData: 1,
      conciliadosManualmente: 0,
      pendentesNoBanco: 1,
      pendentesNoSistema: 1,
      saldoPendenteCentavos: 999 + 4_321,
    });
  });

  it('conta as divergencias marcadas', () => {
    const resultado = conciliarAutomatico([lancamento({ id: 'L-1' })], [], AGORA);
    const comDivergencia = {
      ...resultado,
      pendencias: marcarDivergencia(resultado.pendencias, 'banco:L-1', 'Tarifa', OPERADOR),
    };

    expect(relatorioDeConciliacao(comDivergencia, '2026-06-01', '2026-06-30').divergentes).toBe(1);
  });
});
