import { PARAMETROS_PADRAO } from '@synapse/validation';
import { cadastro, CLIENTE, HOJE, liquidacao, pedido, titulo } from '../testing/fixtures';
import { camposFaltando, situacaoDeCredito, type EntradaDaSituacao } from './situacao-de-credito';

const entrada = (extra: Partial<EntradaDaSituacao> = {}): EntradaDaSituacao => ({
  customerId: CLIENTE,
  titulos: [],
  cadastro: cadastro(),
  aprovados: [],
  parametros: PARAMETROS_PADRAO,
  hoje: HOJE,
  agora: `${HOJE}T12:00:00.000Z`,
  ...extra,
});

describe('situacaoDeCredito', () => {
  it('limite disponivel = limite - (titulos em aberto + aprovados nao faturados)', () => {
    const situacao = situacaoDeCredito(
      entrada({
        titulos: [titulo({ id: 'a', valorOriginalCentavos: 300_000, vencimento: '2026-10-01' })],
        aprovados: [
          pedido({ id: 'ap', situacao: 'APROVADO', totalCentavos: 200_000 }),
          // Aprovado de troca nao compromete limite.
          pedido({ id: 'tr', situacao: 'APROVADO', tipo: 'TROCA', totalCentavos: 50_000 }),
        ],
      }),
    );
    expect(situacao).toMatchObject({
      limiteCentavos: 1_000_000,
      emAbertoCentavos: 300_000,
      aprovadosNaoFaturadosCentavos: 200_000,
      comprometidoCentavos: 500_000,
      disponivelCentavos: 500_000,
    });
  });

  it('titulo parcialmente pago compromete so o saldo', () => {
    const situacao = situacaoDeCredito(
      entrada({
        titulos: [
          titulo({
            valorOriginalCentavos: 200_000,
            vencimento: '2026-10-01',
            status: 'PARCIAL',
            liquidacoes: [liquidacao({ valorCentavos: 80_000 })],
          }),
        ],
      }),
    );
    expect(situacao.emAbertoCentavos).toBe(120_000);
  });

  it('cancelado e renegociado nao contam; aprovado de outro cliente tambem nao', () => {
    const situacao = situacaoDeCredito(
      entrada({
        titulos: [
          titulo({ id: 'c', status: 'CANCELADO', valorOriginalCentavos: 999 }),
          titulo({ id: 'r', status: 'RENEGOCIADO', valorOriginalCentavos: 999 }),
          titulo({ id: 'x', customerId: 'outro' as never, valorOriginalCentavos: 999 }),
        ],
        aprovados: [pedido({ customerId: 'outro' as never, situacao: 'APROVADO' })],
      }),
    );
    expect(situacao.comprometidoCentavos).toBe(0);
    expect(situacao.possuiTitulos).toBe(true);
  });

  it('sem cadastro, o limite e nulo e o disponivel tambem', () => {
    const situacao = situacaoDeCredito(entrada({ cadastro: null }));
    expect(situacao.limiteCentavos).toBeNull();
    expect(situacao.disponivelCentavos).toBeNull();
    expect(situacao.cadastro).toEqual({ existe: false, faltando: [] });
  });

  it('usa a regra de inadimplencia do financeiro, com a tolerancia de 2 dias', () => {
    const dentro = situacaoDeCredito(entrada({ titulos: [titulo({ vencimento: '2026-09-12' })] }));
    expect(dentro.titulosVencidos).toBe(1);
    expect(dentro.inadimplencia.bloqueia).toBe(false);

    const acima = situacaoDeCredito(entrada({ titulos: [titulo({ vencimento: '2026-08-26' })] }));
    expect(acima.diasDeAtrasoMaximo).toBe(18);
    expect(acima.inadimplencia).toMatchObject({ bloqueia: true, motivo: 'ATRASO' });
    expect(acima.vencidoCentavos).toBe(10_000);
  });

  it('cadastro bloqueado aparece como bloqueado', () => {
    expect(
      situacaoDeCredito(entrada({ cadastro: cadastro({ financialStatus: 'BLOCKED' }) })).bloqueado,
    ).toBe(true);
  });

  it('conta como liquidado so o que foi pago, nao o que foi cancelado', () => {
    const situacao = situacaoDeCredito(
      entrada({
        titulos: [
          titulo({ id: 'p', status: 'QUITADO', liquidacoes: [liquidacao()] }),
          titulo({ id: 'c', status: 'CANCELADO', liquidacoes: [liquidacao()] }),
        ],
      }),
    );
    expect(situacao.titulosLiquidados).toBe(1);
  });
});

describe('camposFaltando', () => {
  it('lista o que falta para faturar', () => {
    expect(camposFaltando(cadastro())).toEqual([]);
    expect(
      camposFaltando(
        cadastro({
          phone: '',
          address: {
            street: '',
            number: '',
            complement: null,
            district: '',
            city: 'Goiânia',
            state: '',
            postalCode: '742',
          },
        }),
      ),
    ).toEqual(['telefone', 'logradouro', 'UF', 'CEP']);
  });
});

describe('pedido aprovado, depois titulo: sem contagem dupla', () => {
  const aprovado = pedido({ id: 'pedido-5000', situacao: 'APROVADO', totalCentavos: 500_000 });
  const parcela = (id: string, valor: number, extra = {}) =>
    titulo({
      id,
      orderId: 'pedido-5000' as never,
      valorOriginalCentavos: valor,
      vencimento: '2026-10-30',
      ...extra,
    });

  it('em analise nao compromete; aprovado sem titulo compromete 5.000', () => {
    const emAnalise = situacaoDeCredito(entrada({ aprovados: [], titulos: [] }));
    expect(emAnalise.comprometidoCentavos).toBe(0);
    const depois = situacaoDeCredito(entrada({ aprovados: [aprovado] }));
    expect(depois.aprovadosNaoFaturadosCentavos).toBe(500_000);
    expect(depois.comprometidoCentavos).toBe(500_000);
  });

  it('titulo gerado com o pedido ainda APROVADO: continua 5.000, nunca 10.000', () => {
    const situacao = situacaoDeCredito(
      entrada({
        aprovados: [aprovado],
        titulos: [parcela('p1', 250_000), parcela('p2', 250_000)],
      }),
    );
    expect(situacao.emAbertoCentavos).toBe(500_000);
    expect(situacao.aprovadosNaoFaturadosCentavos).toBe(0);
    expect(situacao.comprometidoCentavos).toBe(500_000);
  });

  it('pedido faturado: conta so pelo saldo dos titulos', () => {
    const faturado = { ...aprovado, situacao: 'FATURADO' as const };
    const situacao = situacaoDeCredito(
      entrada({
        aprovados: [faturado],
        titulos: [
          parcela('p1', 250_000, {
            status: 'QUITADO',
            liquidacoes: [liquidacao({ valorCentavos: 250_000 })],
          }),
          parcela('p2', 250_000),
        ],
      }),
    );
    expect(situacao.comprometidoCentavos).toBe(250_000);
  });

  it('titulo do pedido cancelado nao tira o pedido aprovado da soma', () => {
    const situacao = situacaoDeCredito(
      entrada({
        aprovados: [aprovado],
        titulos: [parcela('p1', 500_000, { status: 'CANCELADO' })],
      }),
    );
    expect(situacao.comprometidoCentavos).toBe(500_000);
  });

  it('titulo de outro pedido nao desconta este', () => {
    const situacao = situacaoDeCredito(
      entrada({
        aprovados: [aprovado],
        titulos: [
          titulo({
            id: 'outro',
            orderId: 'pedido-9' as never,
            valorOriginalCentavos: 100_000,
            vencimento: '2026-10-30',
          }),
        ],
      }),
    );
    expect(situacao.comprometidoCentavos).toBe(600_000);
  });

  it('consignacao aprovada compromete o valor integral', () => {
    const consignado = pedido({
      id: 'cons',
      tipo: 'CONSIGNACAO',
      situacao: 'APROVADO',
      totalCentavos: 300_000,
    });
    expect(situacaoDeCredito(entrada({ aprovados: [consignado] })).comprometidoCentavos).toBe(
      300_000,
    );
  });
});
