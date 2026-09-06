import type { CustomerId, Recorrencia, Titulo } from '@synapse/types';
import { avaliarCredito, POLITICA_PADRAO, vencimentosDaRecorrencia } from './credito-do-cliente';
import { registrarLiquidacao } from './titulo';

const HOJE = '2026-06-15';
const CLIENTE = 'cliente-1' as CustomerId;

const titulo = (extra: Partial<Titulo> = {}): Titulo =>
  ({
    id: 'T-1',
    tenantId: 'tenant-1',
    branchId: 'filial-1',
    tipo: 'RECEBER',
    descricao: 'Pedido',
    customerId: CLIENTE,
    fornecedorId: null,
    orderId: null,
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

// c24-8: bloqueio de venda para cliente inadimplente.
describe('avaliarCredito', () => {
  it('libera quem nao tem titulo vencido', () => {
    expect(avaliarCredito(CLIENTE, [titulo()], POLITICA_PADRAO, HOJE)).toEqual({ liberado: true });
  });

  it('bloqueia quem passou da tolerancia, dizendo o porque', () => {
    const avaliacao = avaliarCredito(
      CLIENTE,
      [titulo({ vencimento: '2026-06-01', valorOriginalCentavos: 30_000 })],
      POLITICA_PADRAO,
      HOJE,
    );

    expect(avaliacao.liberado).toBe(false);
    if (avaliacao.liberado) return;
    expect(avaliacao.motivo).toBe('ATRASO');
    expect(avaliacao.diasDeAtrasoMaximo).toBe(14);
    expect(avaliacao.saldoVencidoCentavos).toBe(30_000);
    expect(avaliacao.mensagem).toMatch(/1 título\(s\) vencido\(s\)/);
  });

  // Boleto compensa em D+1: bloquear no primeiro dia barraria quem ja pagou.
  it('respeita a tolerancia de dias', () => {
    const ontem = titulo({ vencimento: '2026-06-14' });
    expect(avaliarCredito(CLIENTE, [ontem], POLITICA_PADRAO, HOJE).liberado).toBe(true);

    const semTolerancia = { ...POLITICA_PADRAO, diasDeToleranciaAtraso: 0 };
    expect(avaliarCredito(CLIENTE, [ontem], semTolerancia, HOJE).liberado).toBe(false);
  });

  it('bloqueia por limite de saldo vencido antes de estourar a tolerancia', () => {
    const politica = {
      bloquearInadimplente: true,
      diasDeToleranciaAtraso: 30,
      limiteDeSaldoVencidoCentavos: 20_000,
    };
    const avaliacao = avaliarCredito(
      CLIENTE,
      [titulo({ vencimento: '2026-06-10', valorOriginalCentavos: 50_000 })],
      politica,
      HOJE,
    );

    expect(avaliacao.liberado).toBe(false);
    if (!avaliacao.liberado) expect(avaliacao.motivo).toBe('LIMITE_DE_SALDO_VENCIDO');
  });

  it('conta o saldo, e nao o valor cheio, de quem pagou parte', () => {
    const parcial = registrarLiquidacao(
      titulo({ vencimento: '2026-06-01' }),
      {
        id: 'L1',
        data: HOJE,
        valorCentavos: 95_000,
        forma: 'PIX',
        observacao: null,
        referenciaBancaria: null,
        registradoPor: 'uid-1' as never,
        registradoEm: `${HOJE}T10:00:00.000Z`,
      },
      HOJE,
    );

    const avaliacao = avaliarCredito(CLIENTE, [parcial], POLITICA_PADRAO, HOJE);
    if (!avaliacao.liberado) expect(avaliacao.saldoVencidoCentavos).toBe(5_000);
  });

  it('nao mistura o vencido de outro cliente', () => {
    const deOutro = titulo({ customerId: 'cliente-2' as CustomerId, vencimento: '2026-01-01' });
    expect(avaliarCredito(CLIENTE, [deOutro], POLITICA_PADRAO, HOJE).liberado).toBe(true);
  });

  it('libera tudo quando a politica esta desligada', () => {
    const politica = { ...POLITICA_PADRAO, bloquearInadimplente: false };
    const vencidoHaMuito = titulo({ vencimento: '2020-01-01' });
    expect(avaliarCredito(CLIENTE, [vencidoHaMuito], politica, HOJE).liberado).toBe(true);
  });

  it('titulo renegociado nao bloqueia: quem responde e o que o substituiu', () => {
    const antigo = titulo({ vencimento: '2026-01-01', status: 'RENEGOCIADO' });
    expect(avaliarCredito(CLIENTE, [antigo], POLITICA_PADRAO, HOJE).liberado).toBe(true);
  });
});

// c24-5: contas a pagar com recorrencia.
describe('vencimentosDaRecorrencia', () => {
  const recorrencia = (extra: Partial<Recorrencia> = {}): Recorrencia => ({
    id: 'R-1',
    descricao: 'Aluguel',
    fornecedorId: null,
    valorCentavos: 500_000,
    periodicidade: 'MENSAL',
    diaDoVencimento: 10,
    inicio: '2026-01-01',
    fim: null,
    centroDeCustoId: null,
    categoriaId: null,
    ativa: true,
    ...extra,
  });

  it('gera um vencimento por mes', () => {
    expect(vencimentosDaRecorrencia(recorrencia(), '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
      '2026-04-10',
    ]);
  });

  // Aluguel que vence dia 31 vence dia 28 em fevereiro, nao dia 3 de marco.
  it('encaixa no ultimo dia do mes quando o dia nao existe', () => {
    const datas = vencimentosDaRecorrencia(
      recorrencia({ diaDoVencimento: 31 }),
      '2026-01-01',
      '2026-04-30',
    );
    expect(datas).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('respeita inicio e fim', () => {
    const datas = vencimentosDaRecorrencia(
      recorrencia({ inicio: '2026-02-01', fim: '2026-03-31' }),
      '2026-01-01',
      '2026-12-31',
    );
    expect(datas).toEqual(['2026-02-10', '2026-03-10']);
  });

  it('nao gera nada para recorrencia desativada', () => {
    expect(
      vencimentosDaRecorrencia(recorrencia({ ativa: false }), '2026-01-01', '2026-12-31'),
    ).toEqual([]);
  });

  it('gera semanal e quinzenal pelo passo em dias', () => {
    const semanal = vencimentosDaRecorrencia(
      recorrencia({ periodicidade: 'SEMANAL', inicio: '2026-03-02' }),
      '2026-03-01',
      '2026-03-23',
    );
    expect(semanal).toEqual(['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23']);

    const quinzenal = vencimentosDaRecorrencia(
      recorrencia({ periodicidade: 'QUINZENAL', inicio: '2026-03-01' }),
      '2026-03-01',
      '2026-03-31',
    );
    expect(quinzenal).toEqual(['2026-03-01', '2026-03-16', '2026-03-31']);
  });

  it('gera anual no mesmo dia de cada ano', () => {
    const datas = vencimentosDaRecorrencia(
      recorrencia({ periodicidade: 'ANUAL', diaDoVencimento: 5, inicio: '2026-05-01' }),
      '2026-01-01',
      '2028-12-31',
    );
    expect(datas).toEqual(['2026-05-05', '2027-05-05', '2028-05-05']);
  });
});
