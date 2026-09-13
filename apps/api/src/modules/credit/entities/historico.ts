import type {
  EtapaDoPedido,
  EventoDoPedido,
  ImpactoDaAprovacao,
  MotivoDaAnalise,
  ObservacaoDoPedido,
  PedidoDeVenda,
  RegistroDaAvaliacao,
  SituacaoDoPedido,
  TipoDeEvento,
  ValorRegistrado,
} from '@synapse/types';

/** Rastro do pedido: cada acao acrescenta um evento e nada e apagado. Puro, sem
 *  I/O — o repositorio so grava o que sai daqui. */

export interface Ator {
  readonly uid: string;
  readonly nome: string;
}

/** O proprio sistema, quando e ele quem avalia o pedido na chegada. */
export const SYNAPSE: Ator = { uid: 'synapse', nome: 'Synapse' };

interface Complemento {
  readonly justificativa?: string | null;
  readonly motivos?: readonly MotivoDaAnalise[];
  readonly valores?: readonly ValorRegistrado[];
}

export const evento = (
  tipo: TipoDeEvento,
  etapa: EtapaDoPedido,
  ator: Ator,
  em: string,
  detalhe: string | null = null,
  complemento: Complemento = {},
): EventoDoPedido => ({
  tipo,
  etapa,
  em,
  porUid: ator.uid,
  porNome: ator.nome,
  detalhe,
  ...(complemento.justificativa ? { justificativa: complemento.justificativa } : {}),
  ...(complemento.motivos?.length
    ? { motivos: complemento.motivos.map((motivo) => motivo.codigo) }
    : {}),
  ...(complemento.valores?.length ? { valores: complemento.valores } : {}),
});

const SITUACAO_POR_EXTENSO: Record<SituacaoDoPedido, string> = {
  AGUARDANDO_ANALISE: 'aguardando análise',
  APROVADO: 'liberado',
  REPROVADO: 'reprovado',
  FATURADO: 'faturado',
  CANCELADO: 'cancelado',
};

/** Por que o pedido nao pode ser decidido agora — ou nulo, se pode. Pedido ja
 *  decidido nao e decidido de novo: dois analistas clicando juntos nao geram
 *  dois eventos nem pulam a fila do faturamento. */
export const motivoParaNaoLiberar = (pedido: PedidoDeVenda | null): string | null => {
  if (!pedido) return 'Pedido não encontrado';
  if (pedido.situacao !== 'AGUARDANDO_ANALISE')
    return `Pedido ${pedido.numero} já está ${SITUACAO_POR_EXTENSO[pedido.situacao]}`;
  return null;
};

/** Os numeros que a decisao mexeu, crus: limite, disponivel e utilizacao antes
 *  e depois. A auditoria refaz a conta com eles. */
export const valoresDoImpacto = (impacto: ImpactoDaAprovacao): readonly ValorRegistrado[] => [
  {
    campo: 'exposicao',
    rotulo: 'Exposição do pedido',
    unidade: 'centavos',
    antes: null,
    depois: impacto.exposicaoCentavos,
  },
  {
    campo: 'limite',
    rotulo: 'Limite de crédito',
    unidade: 'centavos',
    antes: impacto.limiteCentavos,
    depois: impacto.limiteCentavos,
  },
  {
    campo: 'disponivel',
    rotulo: 'Disponível',
    unidade: 'centavos',
    antes: impacto.disponivelAntesCentavos,
    depois: impacto.disponivelDepoisCentavos,
  },
  {
    campo: 'utilizacao',
    rotulo: 'Utilização do limite',
    unidade: 'percentual',
    antes: impacto.utilizacaoAntesPercentual,
    depois: impacto.utilizacaoDepoisPercentual,
  },
];

/** O que estava valendo quando o analista decidiu. */
export interface ContextoDaDecisao {
  readonly excepcional: boolean;
  readonly justificativa: string | null;
  readonly motivos: readonly MotivoDaAnalise[];
  readonly impacto: ImpactoDaAprovacao | null;
}

const rotuloDosMotivos = (motivos: readonly MotivoDaAnalise[]): string =>
  motivos.map((motivo) => motivo.rotulo.toLowerCase()).join(', ');

/** Liberado no credito, o pedido segue para o faturamento. A aprovacao
 *  excepcional leva a justificativa e os motivos que ela passou por cima. */
export const liberarPedido = (
  pedido: PedidoDeVenda,
  ator: Ator,
  em: string,
  contexto?: ContextoDaDecisao,
): PedidoDeVenda => {
  const excepcional = contexto?.excepcional ?? false;
  const violados = (contexto?.motivos ?? []).filter((motivo) => motivo.violaPolitica);
  const detalhe = excepcional
    ? `Aprovado fora da política (${rotuloDosMotivos(violados)}) — segue para o faturamento`
    : 'Liberado na análise de crédito — segue para o faturamento';
  return {
    ...pedido,
    situacao: 'APROVADO',
    analisadoEm: em,
    analisadoPor: ator.uid as PedidoDeVenda['analisadoPor'],
    historico: [
      ...(pedido.historico ?? []),
      evento(excepcional ? 'LIBERADO_EXCECAO' : 'LIBERADO', 'CREDITO', ator, em, detalhe, {
        justificativa: contexto?.justificativa ?? null,
        motivos: contexto?.motivos ?? [],
        valores: contexto?.impacto ? valoresDoImpacto(contexto.impacto) : [],
      }),
    ],
  };
};

/** Reprovado, o pedido sai da fila e nao vai ao faturamento. A justificativa e
 *  obrigatoria: e o que o vendedor le para explicar ao cliente. */
export const reprovarPedido = (
  pedido: PedidoDeVenda,
  ator: Ator,
  em: string,
  contexto: ContextoDaDecisao,
): PedidoDeVenda => ({
  ...pedido,
  situacao: 'REPROVADO',
  analisadoEm: em,
  analisadoPor: ator.uid as PedidoDeVenda['analisadoPor'],
  historico: [
    ...(pedido.historico ?? []),
    evento('REPROVADO', 'CREDITO', ator, em, 'Reprovado na análise de crédito', {
      justificativa: contexto.justificativa,
      motivos: contexto.motivos,
      valores: contexto.impacto ? valoresDoImpacto(contexto.impacto) : [],
    }),
  ],
});

/** Na chegada, o Synapse registra por que o pedido esta em analise. E isso que
 *  impede de inventar o motivo depois: o que nao foi registrado aqui aparece
 *  como "nao registrado", e nao como uma reconstrucao. */
export const acionarAnalise = (
  pedido: PedidoDeVenda,
  avaliacao: RegistroDaAvaliacao,
): PedidoDeVenda => ({
  ...pedido,
  analiseNoEnvio: avaliacao,
  historico: [
    ...(pedido.historico ?? []),
    evento(
      'ANALISE_ACIONADA',
      'CREDITO',
      SYNAPSE,
      avaliacao.avaliadaEm,
      `Análise acionada: ${rotuloDosMotivos(avaliacao.motivos)}`,
      { motivos: avaliacao.motivos },
    ),
  ],
});

/** Meia hora: quem abre e fecha a mesma analise varias vezes deixa um rastro
 *  so, e quem volta no dia seguinte deixa outro. */
export const INTERVALO_DE_VISUALIZACAO_MS = 30 * 60_000;

/** Registra que alguem abriu a analise — ou devolve nulo se a mesma pessoa ja
 *  abriu ha pouco, para nao encher o historico de "visualizou". */
export const registrarVisualizacao = (
  pedido: PedidoDeVenda,
  ator: Ator,
  em: string,
): PedidoDeVenda | null => {
  const instante = Date.parse(em);
  const recente = (pedido.historico ?? []).some(
    (item) =>
      item.tipo === 'VISUALIZADO' &&
      item.porUid === ator.uid &&
      instante - Date.parse(item.em) < INTERVALO_DE_VISUALIZACAO_MS,
  );
  if (recente) return null;
  return {
    ...pedido,
    historico: [
      ...(pedido.historico ?? []),
      evento('VISUALIZADO', 'CREDITO', ator, em, 'Análise do pedido aberta'),
    ],
  };
};

/** Observacao entra na lista e deixa rastro no historico, com a etapa em que foi
 *  escrita: e o que diz se quem falou foi o vendedor, o credito ou a expedicao. */
export const observarPedido = (
  pedido: PedidoDeVenda,
  observacao: ObservacaoDoPedido,
): PedidoDeVenda => ({
  ...pedido,
  observacoes: [...(pedido.observacoes ?? []), observacao],
  historico: [
    ...(pedido.historico ?? []),
    evento(
      'OBSERVACAO',
      observacao.etapa,
      { uid: observacao.porUid, nome: observacao.porNome },
      observacao.em,
      observacao.texto.length > 140 ? `${observacao.texto.slice(0, 137)}…` : observacao.texto,
    ),
  ],
});

/** Marca de impressao tambem e rastro: saber quem imprimiu e quando evita o
 *  "achei que ja tinham separado". Desmarcar nao gera evento. */
export const registrarImpressao = (
  pedido: PedidoDeVenda,
  ator: Ator,
  em: string,
  impresso: boolean,
): PedidoDeVenda => {
  const marcas = new Set(pedido.impressoPor ?? []);
  if (impresso) marcas.add(ator.uid as PedidoDeVenda['impressoPor'][number]);
  else marcas.delete(ator.uid as PedidoDeVenda['impressoPor'][number]);
  return {
    ...pedido,
    impressoPor: [...marcas],
    historico: impresso
      ? [...(pedido.historico ?? []), evento('IMPRESSO', 'CREDITO', ator, em)]
      : (pedido.historico ?? []),
  };
};

/** Quem digitou o pedido. Pedido novo guarda o campo; o antigo so tem o autor
 *  do evento LANCADO — que e a mesma informacao, registrada na hora. */
export const lancadoPorDe = (pedido: PedidoDeVenda): Ator | null => {
  if (pedido.lancadoPor) return pedido.lancadoPor;
  const lancado = (pedido.historico ?? []).find((item) => item.tipo === 'LANCADO');
  return lancado ? { uid: lancado.porUid, nome: lancado.porNome } : null;
};
