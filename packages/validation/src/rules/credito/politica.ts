import type {
  CodigoDoMotivo,
  ExposicaoDoPedido,
  ImpactoDaAprovacao,
  MotivoDaAnalise,
  ParametrosDaAnalise,
  SituacaoDeCredito,
} from '@synapse/types';
import { moeda, plural, umaCasa } from './texto';

/** Politica de credito da analise: por que o pedido esta aqui, o que ele muda
 *  no limite e se aprovar exige justificativa.
 *
 *  As regras de bloqueio sao as que o Synapse ja tinha, reunidas num lugar so:
 *  cliente bloqueado ou com limite estourado nao compra a prazo (cadastro de
 *  clientes), e atraso acima da tolerancia bloqueia (financeiro, c24-8). Ferir
 *  uma delas nao trava a tela: o analista pode aprovar excepcionalmente, desde
 *  que diga por que — e isso fica no rastro do pedido.
 *
 *  O resto sao alertas. Cliente novo, historico curto e cadastro incompleto
 *  informam, mas nao impedem nada. */

export const PARAMETROS_PADRAO: ParametrosDaAnalise = {
  minimoDeTitulosLiquidados: 5,
  minimoDePedidosParaComparar: 3,
  toleranciaDeAtrasoDias: 2,
  utilizacaoDeAtencaoPercentual: 80,
};

export const ROTULO_DO_MOTIVO: Record<CodigoDoMotivo, string> = {
  CLIENTE_BLOQUEADO: 'Cliente bloqueado',
  TITULO_VENCIDO: 'Título vencido',
  SALDO_VENCIDO_ACIMA_DO_LIMITE: 'Saldo vencido acima do limite',
  SEM_LIMITE_DE_CREDITO: 'Sem limite de crédito',
  LIMITE_EXCEDIDO: 'Limite excedido',
  LIMITE_INSUFICIENTE: 'Limite insuficiente',
  CADASTRO_INCOMPLETO: 'Cadastro incompleto',
  SEM_HISTORICO_DE_CREDITO: 'Primeira compra a prazo',
  HISTORICO_INSUFICIENTE: 'Histórico insuficiente',
  ANALISE_OBRIGATORIA: 'Análise de rotina',
};

/** Comprometido sobre o limite, em percentual com uma casa. Sem limite, nao ha
 *  percentual: dividir por zero nao e "100%". */
export const utilizacaoDoLimite = (
  comprometidoCentavos: number,
  limiteCentavos: number | null,
): number | null =>
  limiteCentavos && limiteCentavos > 0
    ? umaCasa((comprometidoCentavos / limiteCentavos) * 100)
    : null;

/** O antes e o depois de aprovar. `jaComprometidoNoLote` e a exposicao dos
 *  pedidos aprovados antes deste no mesmo lote. */
export const impactoDaAprovacao = (
  situacao: SituacaoDeCredito,
  exposicao: ExposicaoDoPedido,
  jaComprometidoNoLote = 0,
): ImpactoDaAprovacao => {
  const limite = situacao.limiteCentavos;
  const antes = situacao.comprometidoCentavos + jaComprometidoNoLote;
  const depois = antes + exposicao.exposicaoCentavos;
  return {
    limiteCentavos: limite,
    comprometidoAntesCentavos: antes,
    disponivelAntesCentavos: limite === null ? null : limite - antes,
    valorComercialCentavos: exposicao.valorComercialCentavos,
    exposicaoCentavos: exposicao.exposicaoCentavos,
    comprometidoDepoisCentavos: depois,
    disponivelDepoisCentavos: limite === null ? null : limite - depois,
    utilizacaoAntesPercentual: utilizacaoDoLimite(antes, limite),
    utilizacaoDepoisPercentual: utilizacaoDoLimite(depois, limite),
    consomeLimite: exposicao.consomeLimite,
  };
};

const motivo = (
  codigo: CodigoDoMotivo,
  detalhe: string,
  violaPolitica: boolean,
): MotivoDaAnalise => ({ codigo, rotulo: ROTULO_DO_MOTIVO[codigo], detalhe, violaPolitica });

const motivosDeInadimplencia = (
  situacao: SituacaoDeCredito,
  concedeCredito: boolean,
  parametros: ParametrosDaAnalise,
): MotivoDaAnalise[] => {
  const { inadimplencia } = situacao;
  if (inadimplencia.bloqueia && inadimplencia.motivo === 'LIMITE_DE_SALDO_VENCIDO') {
    return [
      motivo(
        'SALDO_VENCIDO_ACIMA_DO_LIMITE',
        `${moeda(situacao.vencidoCentavos)} vencidos passam do limite de saldo vencido da política.`,
        concedeCredito,
      ),
    ];
  }
  if (situacao.titulosVencidos === 0) return [];
  const atraso = plural(situacao.diasDeAtrasoMaximo, 'dia', 'dias');
  const quantos = plural(situacao.titulosVencidos, 'título vencido', 'títulos vencidos');
  const detalhe = inadimplencia.bloqueia
    ? `${quantos}, o mais antigo há ${atraso} — acima da tolerância de ${plural(parametros.toleranciaDeAtrasoDias, 'dia', 'dias')}.`
    : `${quantos} há ${atraso}, dentro da tolerância de ${plural(parametros.toleranciaDeAtrasoDias, 'dia', 'dias')}.`;
  return [motivo('TITULO_VENCIDO', detalhe, inadimplencia.bloqueia && concedeCredito)];
};

const motivosDeLimite = (
  situacao: SituacaoDeCredito,
  exposicao: ExposicaoDoPedido,
  jaComprometidoNoLote: number,
): MotivoDaAnalise[] => {
  const limite = situacao.limiteCentavos;
  if (limite === null || limite <= 0) {
    return [
      motivo(
        'SEM_LIMITE_DE_CREDITO',
        limite === null
          ? 'O cliente não tem cadastro com limite de crédito.'
          : 'O cadastro do cliente não tem limite de crédito concedido.',
        true,
      ),
    ];
  }
  const comprometido = situacao.comprometidoCentavos + jaComprometidoNoLote;
  const disponivel = limite - comprometido;
  if (disponivel < 0) {
    return [
      motivo(
        'LIMITE_EXCEDIDO',
        `O comprometido de ${moeda(comprometido)} já passa do limite de ${moeda(limite)}.`,
        true,
      ),
    ];
  }
  if (exposicao.exposicaoCentavos > disponivel) {
    return [
      motivo(
        'LIMITE_INSUFICIENTE',
        `Exposição de ${moeda(exposicao.exposicaoCentavos)} para ${moeda(disponivel)} disponíveis.`,
        true,
      ),
    ];
  }
  return [];
};

const motivosDeHistorico = (
  situacao: SituacaoDeCredito,
  parametros: ParametrosDaAnalise,
): MotivoDaAnalise[] => {
  if (!situacao.possuiTitulos) {
    return [
      motivo(
        'SEM_HISTORICO_DE_CREDITO',
        'O cliente nunca teve título a receber: não há como avaliar como paga.',
        false,
      ),
    ];
  }
  if (situacao.titulosLiquidados < parametros.minimoDeTitulosLiquidados) {
    return [
      motivo(
        'HISTORICO_INSUFICIENTE',
        `${plural(situacao.titulosLiquidados, 'título liquidado', 'títulos liquidados')} — o mínimo para concluir é ${parametros.minimoDeTitulosLiquidados}.`,
        false,
      ),
    ];
  }
  return [];
};

/** Por que o pedido esta em analise, com a evidencia de cada motivo. Um pedido
 *  pode ter varios; sem nenhum, esta aqui porque todo pedido passa pelo credito. */
export const motivosDaAnalise = (
  situacao: SituacaoDeCredito,
  exposicao: ExposicaoDoPedido,
  parametros: ParametrosDaAnalise = PARAMETROS_PADRAO,
  jaComprometidoNoLote = 0,
): readonly MotivoDaAnalise[] => {
  // As regras de credito so pesam quando o pedido concede credito: troca de
  // cliente bloqueado e informacao, e nao motivo para travar a troca.
  const concedeCredito = exposicao.consomeLimite;
  const motivos: MotivoDaAnalise[] = [];

  if (situacao.bloqueado) {
    motivos.push(
      motivo(
        'CLIENTE_BLOQUEADO',
        'O cadastro do cliente está com a situação financeira bloqueada.',
        concedeCredito,
      ),
    );
  }
  motivos.push(...motivosDeInadimplencia(situacao, concedeCredito, parametros));
  if (concedeCredito) motivos.push(...motivosDeLimite(situacao, exposicao, jaComprometidoNoLote));
  if (!situacao.cadastro.existe || situacao.cadastro.faltando.length > 0) {
    motivos.push(
      motivo(
        'CADASTRO_INCOMPLETO',
        situacao.cadastro.existe
          ? `Faltam no cadastro: ${situacao.cadastro.faltando.join(', ')}.`
          : 'O cliente ainda não tem cadastro gravado.',
        false,
      ),
    );
  }
  if (concedeCredito) motivos.push(...motivosDeHistorico(situacao, parametros));

  if (motivos.length === 0) {
    motivos.push(
      motivo(
        'ANALISE_OBRIGATORIA',
        'Todo pedido passa pela análise de crédito antes do faturamento.',
        false,
      ),
    );
  }
  return motivos;
};

export const violaPolitica = (motivos: readonly MotivoDaAnalise[]): boolean =>
  motivos.some((item) => item.violaPolitica);

export interface PedidoDoLote {
  readonly pedidoId: string;
  readonly enviadoEm: string;
  readonly exposicao: ExposicaoDoPedido;
}

export interface ItemDoLote {
  readonly pedidoId: string;
  readonly motivos: readonly MotivoDaAnalise[];
  readonly violaPolitica: boolean;
  readonly impacto: ImpactoDaAprovacao;
}

export interface AvaliacaoDoLote {
  readonly itens: readonly ItemDoLote[];
  readonly valorComercialCentavos: number;
  readonly exposicaoCentavos: number;
  readonly disponivelDepoisCentavos: number | null;
  readonly utilizacaoDepoisPercentual: number | null;
  /** Pedidos que so passam com aprovacao excepcional. */
  readonly excepcionais: readonly string[];
}

/** Aprovar varios de uma vez consome o limite em sequencia: o primeiro pode
 *  caber e o terceiro nao. Avalia do mais antigo para o mais recente — a mesma
 *  ordem na tela e na API, entao o botao diz o que o servidor vai fazer. */
export const avaliarLote = (
  situacao: SituacaoDeCredito,
  pedidos: readonly PedidoDoLote[],
  parametros: ParametrosDaAnalise = PARAMETROS_PADRAO,
): AvaliacaoDoLote => {
  const ordenados = [...pedidos].sort(
    (a, b) => a.enviadoEm.localeCompare(b.enviadoEm) || a.pedidoId.localeCompare(b.pedidoId),
  );
  let acumulado = 0;
  const itens = ordenados.map((pedido) => {
    const motivos = motivosDaAnalise(situacao, pedido.exposicao, parametros, acumulado);
    const impacto = impactoDaAprovacao(situacao, pedido.exposicao, acumulado);
    acumulado += pedido.exposicao.exposicaoCentavos;
    return { pedidoId: pedido.pedidoId, motivos, violaPolitica: violaPolitica(motivos), impacto };
  });
  const limite = situacao.limiteCentavos;
  const comprometidoDepois = situacao.comprometidoCentavos + acumulado;
  return {
    itens,
    valorComercialCentavos: ordenados.reduce(
      (soma, pedido) => soma + pedido.exposicao.valorComercialCentavos,
      0,
    ),
    exposicaoCentavos: acumulado,
    disponivelDepoisCentavos: limite === null ? null : limite - comprometidoDepois,
    utilizacaoDepoisPercentual: utilizacaoDoLimite(comprometidoDepois, limite),
    excepcionais: itens.filter((item) => item.violaPolitica).map((item) => item.pedidoId),
  };
};

/** Justificativa de verdade, e nao "ok": a auditoria precisa conseguir ler. */
export const JUSTIFICATIVA_MINIMA = 10;

export const justificativaValida = (texto: string | null | undefined): boolean =>
  (texto ?? '').trim().length >= JUSTIFICATIVA_MINIMA;
