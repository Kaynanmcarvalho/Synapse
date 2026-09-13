import type {
  AvaliacaoDoPedido,
  ComportamentoFinanceiro,
  ParametrosDaAnalise,
  PedidoDeVenda,
  RegistroDaAvaliacao,
  ResumoDaAvaliacao,
  SituacaoDeCredito,
} from '@synapse/types';
import {
  exposicaoDoPedido,
  impactoDaAprovacao,
  motivosDaAnalise,
  violaPolitica,
} from '@synapse/validation';
import { comparacaoComHistorico } from './comportamento';
import { sinaisDoPedido } from './sinais';

/** Tudo o que a tela mostra sobre um pedido em analise, calculado num lugar so.
 *  Exposicao, motivos e impacto saem das regras compartilhadas — as mesmas que
 *  a tela usa para somar a selecao —, e o resto sai do comportamento do cliente. */

export const resumoDaAvaliacao = (
  pedido: PedidoDeVenda,
  situacao: SituacaoDeCredito,
  parametros: ParametrosDaAnalise,
): ResumoDaAvaliacao => {
  const exposicao = exposicaoDoPedido(pedido);
  const motivos = motivosDaAnalise(situacao, exposicao, parametros);
  return { exposicao, motivos, violaPolitica: violaPolitica(motivos) };
};

export const registroDaAvaliacao = (
  pedido: PedidoDeVenda,
  situacao: SituacaoDeCredito,
  parametros: ParametrosDaAnalise,
  em: string,
): RegistroDaAvaliacao => ({
  avaliadaEm: em,
  motivos: resumoDaAvaliacao(pedido, situacao, parametros).motivos,
});

export const avaliarPedido = (
  pedido: PedidoDeVenda,
  situacao: SituacaoDeCredito,
  comportamento: ComportamentoFinanceiro,
  recentes: { readonly considerados: number; readonly noPrazo: number },
  parametros: ParametrosDaAnalise,
): AvaliacaoDoPedido => {
  const {
    exposicao,
    motivos,
    violaPolitica: viola,
  } = resumoDaAvaliacao(pedido, situacao, parametros);
  const impacto = impactoDaAprovacao(situacao, exposicao);
  const comparacao = comparacaoComHistorico(pedido, comportamento, parametros);
  return {
    pedidoId: pedido.id,
    exposicao,
    motivos,
    violaPolitica: viola,
    impacto,
    comparacao,
    sinais: sinaisDoPedido({
      pedido,
      situacao,
      comportamento,
      exposicao,
      impacto,
      comparacao,
      recentes,
      parametros,
    }),
  };
};
