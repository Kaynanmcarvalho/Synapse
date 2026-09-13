import type { ComparacaoComHistorico, ComportamentoFinanceiro } from '@synapse/types';
import { exposicaoDoPedido, impactoDaAprovacao, PARAMETROS_PADRAO } from '@synapse/validation';
import { pedido, situacao as situacaoBase } from '../testing/fixtures';
import { sinaisDoPedido, type EntradaDosSinais } from './sinais';

const janela = {
  pontualidade: {
    titulosLiquidados: 0,
    antecipados: 0,
    noVencimento: 0,
    emAtraso: 0,
    percentualNoPrazo: null,
    atrasoMedioDias: null,
    maiorAtrasoDias: null,
    pagoCentavos: 0,
  },
  compras: {
    pedidos: 0,
    valorCentavos: 0,
    ticketMedioCentavos: null,
    prazoMedioDias: null,
    pedidosAPrazo: 0,
  },
};

const comportamento = (extra: Partial<ComportamentoFinanceiro> = {}): ComportamentoFinanceiro => ({
  janelas: { '90D': janela, '6M': janela, '12M': janela },
  titulosConsiderados: 8,
  historicoSuficiente: true,
  ultimoAtraso: null,
  ultimaCompraEm: null,
  maiorExposicaoHistoricaCentavos: null,
  ...extra,
});

const semComparacao: ComparacaoComHistorico = {
  aplicavel: true,
  pedidosNoTicket: 0,
  pedidosNoPrazo: 0,
  amostraSuficiente: false,
  ticketMedioCentavos: null,
  razaoSobreTicket: null,
  prazoMedioHistoricoDias: null,
  diferencaDePrazoDias: null,
};

const sinais = (extra: Partial<EntradaDosSinais> = {}) => {
  const alvo = extra.pedido ?? pedido();
  const situacao = extra.situacao ?? situacaoBase({ comprometidoCentavos: 400_000 });
  const exposicao = exposicaoDoPedido(alvo);
  return sinaisDoPedido({
    pedido: alvo,
    situacao,
    comportamento: comportamento(),
    exposicao,
    impacto: impactoDaAprovacao(situacao, exposicao),
    comparacao: semComparacao,
    recentes: { considerados: 8, noPrazo: 8 },
    parametros: PARAMETROS_PADRAO,
    ...extra,
  });
};

const textos = (lista: ReturnType<typeof sinais>) => lista.map((sinal) => sinal.texto);

describe('sinaisDoPedido', () => {
  it('organiza as evidencias de um bom pagador, cada uma com a fonte', () => {
    const lista = sinais({ pedido: pedido({ totalCentavos: 420_000 }) });
    expect(textos(lista)).toEqual([
      'Nenhum título vencido atualmente',
      'Após aprovação, utilização do limite ficará em 82%',
      '8 dos últimos 8 títulos liquidados foram pagos até o vencimento',
    ]);
    expect(lista.every((sinal) => sinal.fonte.length > 0)).toBe(true);
    expect(lista[1]?.tom).toBe('atencao');
  });

  it('titulo vencido acima da tolerancia e critico', () => {
    const lista = sinais({
      situacao: situacaoBase({
        titulosVencidos: 1,
        diasDeAtrasoMaximo: 18,
        inadimplencia: { bloqueia: true, motivo: 'ATRASO', mensagem: '' },
      }),
    });
    const vencido = lista.find((sinal) => sinal.id === 'vencidos');
    expect(vencido?.texto).toBe('Existe título vencido há 18 dias');
    expect(vencido?.tom).toBe('critico');
  });

  it('sem historico diz que nao ha como avaliar, e nao que o cliente e pontual', () => {
    const lista = sinais({
      situacao: situacaoBase({ possuiTitulos: false, titulosLiquidados: 0 }),
      comportamento: comportamento({ titulosConsiderados: 0, historicoSuficiente: false }),
      recentes: { considerados: 0, noPrazo: 0 },
    });
    expect(textos(lista)).toContain(
      'Sem títulos anteriores: não há histórico de pagamento a prazo',
    );
    expect(textos(lista).join(' ')).not.toContain('pagos até o vencimento');
  });

  it('pouco historico mostra a amostra', () => {
    const lista = sinais({
      comportamento: comportamento({ titulosConsiderados: 2, historicoSuficiente: false }),
    });
    expect(textos(lista)).toContain('Histórico insuficiente: 2 títulos liquidados (o mínimo é 5)');
    expect(textos(lista).join(' ')).not.toContain('pagos até o vencimento');
  });

  it('pedido muito acima do ticket e prazo acima do habitual', () => {
    const lista = sinais({
      pedido: pedido({ totalCentavos: 288_000, prazoMedioEmDias: 42 }),
      comparacao: {
        ...semComparacao,
        amostraSuficiente: true,
        ticketMedioCentavos: 150_000,
        razaoSobreTicket: 1.9,
        prazoMedioHistoricoDias: 28,
        diferencaDePrazoDias: 14,
      },
    });
    expect(textos(lista)).toContain('Pedido 92% acima do ticket médio de 90 dias');
    expect(textos(lista).join(' ')).toContain(
      'Prazo solicitado 14 dias maior que o prazo habitual',
    );
  });

  it('operacao sem cobranca diz que nao compromete limite', () => {
    const lista = sinais({ pedido: pedido({ tipo: 'TROCA' }) });
    expect(textos(lista)).toContain('Pedido não compromete limite de crédito');
    expect(lista.find((sinal) => sinal.id === 'sem-exposicao')?.tom).toBe('neutro');
    expect(textos(lista).join(' ')).not.toContain('utilização do limite');
  });

  it('PIX a vista: nao compromete limite, e diz que o recebimento nao e registrado', () => {
    const lista = sinais({
      pedido: pedido({
        formaDePagamento: 'PIX',
        condicaoDePagamento: 'À vista',
        vencimentosEmDias: [0],
      }),
    });
    expect(textos(lista)).toEqual(
      expect.arrayContaining([
        'Pedido não compromete limite de crédito',
        'O pedido não registra se o pagamento à vista já foi recebido',
      ]),
    );
  });

  it('cartao: exposicao zero pela premissa, e a autorizacao aparece como nao registrada', () => {
    const lista = sinais({ pedido: pedido({ formaDePagamento: 'Cartão de crédito' }) });
    expect(textos(lista)).toContain('O pedido não registra a autorização do cartão');
  });

  it('boleto a prazo nao ganha sinal de premissa', () => {
    const ids = sinais().map((sinal) => sinal.id);
    expect(ids).not.toContain('recebimento-nao-registrado');
    expect(ids).not.toContain('autorizacao-nao-registrada');
  });

  /** Nenhum cenario pode afirmar pagamento, ausencia de risco ou qualidade. */
  const PROIBIDO =
    /pagamento (confirmado|recebido)|já (está|foi) pago|pedido pago|sem risco|bom histórico|bom pagador|ótimo/i;

  it.each([
    ['PIX', { formaDePagamento: 'PIX', condicaoDePagamento: 'À vista', vencimentosEmDias: [0] }],
    [
      'dinheiro',
      { formaDePagamento: 'Dinheiro', condicaoDePagamento: 'À vista', vencimentosEmDias: [0] },
    ],
    ['cartao', { formaDePagamento: 'Cartão' }],
    ['troca', { tipo: 'TROCA' as const }],
    ['consignacao', { tipo: 'CONSIGNACAO' as const }],
    ['boleto', {}],
  ])('%s: nenhum texto afirma pagamento ou ausencia de risco', (_nome, dados) => {
    for (const entrada of [
      {},
      { comportamento: comportamento({ titulosConsiderados: 2, historicoSuficiente: false }) },
      { situacao: situacaoBase({ possuiTitulos: false, titulosLiquidados: 0 }) },
    ]) {
      const lista = sinais({ pedido: pedido(dados), ...entrada });
      for (const sinal of lista) {
        expect(sinal.texto).not.toMatch(PROIBIDO);
        expect(sinal.fonte).not.toMatch(PROIBIDO);
      }
    }
  });

  it('e deterministico: mesma entrada, mesmos sinais', () => {
    expect(sinais()).toEqual(sinais());
  });
});
