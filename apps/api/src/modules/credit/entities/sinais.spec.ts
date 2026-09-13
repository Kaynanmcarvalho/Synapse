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
    expect(textos(lista).join(' ')).toContain('Primeira compra a prazo');
    expect(textos(lista).join(' ')).not.toContain('pagos até o vencimento');
  });

  it('pouco historico mostra a amostra', () => {
    const lista = sinais({
      comportamento: comportamento({ titulosConsiderados: 2, historicoSuficiente: false }),
    });
    expect(textos(lista)).toContain(
      'Cliente possui pouco histórico para análise: 2 títulos liquidados',
    );
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

  it('operacao sem cobranca diz que nao gera exposicao', () => {
    const lista = sinais({ pedido: pedido({ tipo: 'TROCA' }) });
    expect(textos(lista)).toContain('Pedido atual não gera exposição financeira');
    expect(textos(lista).join(' ')).not.toContain('utilização do limite');
  });

  it('e deterministico: mesma entrada, mesmos sinais', () => {
    expect(sinais()).toEqual(sinais());
  });
});
