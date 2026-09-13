import type {
  ComparacaoComHistorico,
  ComportamentoFinanceiro,
  ExposicaoDoPedido,
  ImpactoDaAprovacao,
  ParametrosDaAnalise,
  PedidoDeVenda,
  SinalDeDecisao,
  SituacaoDeCredito,
} from '@synapse/types';

/** Sinais para a decisao: evidencias organizadas em frases, cada uma com a
 *  fonte do dado. Regra fixa, testavel e sem adjetivo — o sinal diz o que os
 *  numeros mostram e para ai. A decisao continua com o analista.
 *
 *  O que um sinal nunca diz: "cliente sem risco", "bom histórico", "pedido já
 *  está pago", "pagamento confirmado". O Synapse nao tem dado para isso — o
 *  pedido nao guarda o recebimento do PIX nem a autorizacao do cartao. */

const plural = (quantidade: number, singular: string, varios: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : varios}`;

const formatarPercentual = (valor: number): string =>
  `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export interface EntradaDosSinais {
  readonly pedido: PedidoDeVenda;
  readonly situacao: SituacaoDeCredito;
  readonly comportamento: ComportamentoFinanceiro;
  readonly exposicao: ExposicaoDoPedido;
  readonly impacto: ImpactoDaAprovacao;
  readonly comparacao: ComparacaoComHistorico;
  readonly recentes: { readonly considerados: number; readonly noPrazo: number };
  readonly parametros: ParametrosDaAnalise;
}

const sinalDeVencidos = ({ situacao }: EntradaDosSinais): SinalDeDecisao =>
  situacao.titulosVencidos === 0
    ? {
        id: 'sem-vencidos',
        tom: 'positivo',
        texto: 'Nenhum título vencido atualmente',
        fonte: 'Títulos a receber',
      }
    : {
        id: 'vencidos',
        tom: situacao.inadimplencia.bloqueia ? 'critico' : 'atencao',
        texto:
          situacao.titulosVencidos === 1
            ? `Existe título vencido há ${plural(situacao.diasDeAtrasoMaximo, 'dia', 'dias')}`
            : `${situacao.titulosVencidos} títulos vencidos, o mais antigo há ${plural(situacao.diasDeAtrasoMaximo, 'dia', 'dias')}`,
        fonte: 'Títulos a receber',
      };

const sinalDeHistorico = (entrada: EntradaDosSinais): SinalDeDecisao | null => {
  const { situacao, comportamento, recentes } = entrada;
  if (!situacao.possuiTitulos) {
    return {
      id: 'sem-historico',
      tom: 'neutro',
      texto: 'Sem títulos anteriores: não há histórico de pagamento a prazo',
      fonte: 'Títulos a receber',
    };
  }
  if (!comportamento.historicoSuficiente) {
    return {
      id: 'historico-insuficiente',
      tom: 'neutro',
      texto: `Histórico insuficiente: ${plural(comportamento.titulosConsiderados, 'título liquidado', 'títulos liquidados')} (o mínimo é ${entrada.parametros.minimoDeTitulosLiquidados})`,
      fonte: 'Títulos liquidados',
    };
  }
  const todos = recentes.noPrazo === recentes.considerados;
  const percentual = (recentes.noPrazo / recentes.considerados) * 100;
  return {
    id: 'pontualidade-recente',
    tom: todos ? 'positivo' : percentual >= 80 ? 'neutro' : 'atencao',
    texto: `${recentes.noPrazo} dos últimos ${recentes.considerados} títulos liquidados foram pagos até o vencimento`,
    fonte: 'Títulos liquidados',
  };
};

const sinalDeTicket = ({ comparacao, exposicao }: EntradaDosSinais): SinalDeDecisao | null => {
  const ticket = comparacao.ticketMedioCentavos;
  if (!ticket) return null;
  const acima = Math.round(((exposicao.valorComercialCentavos - ticket) / ticket) * 100);
  if (acima < 50) return null;
  return {
    id: 'acima-do-ticket',
    tom: 'atencao',
    texto: `Pedido ${acima}% acima do ticket médio de 90 dias`,
    fonte: 'Pedidos aprovados e faturados',
  };
};

const sinalDePrazo = ({ comparacao, pedido }: EntradaDosSinais): SinalDeDecisao | null => {
  const diferenca = comparacao.diferencaDePrazoDias;
  if (diferenca === null || diferenca < 7) return null;
  return {
    id: 'prazo-acima-do-habitual',
    tom: 'atencao',
    texto: `Prazo solicitado ${plural(diferenca, 'dia', 'dias')} maior que o prazo habitual (${comparacao.prazoMedioHistoricoDias} dias; pedido: ${pedido.prazoMedioEmDias} dias)`,
    fonte: 'Pedidos a prazo dos últimos 12 meses',
  };
};

const sinalDeLimite = ({
  impacto,
  exposicao,
  parametros,
}: EntradaDosSinais): SinalDeDecisao | null => {
  if (!exposicao.consomeLimite) {
    // Neutro, e nao positivo: nao consumir limite nao quer dizer que foi pago.
    return {
      id: 'sem-exposicao',
      tom: 'neutro',
      texto: 'Pedido não compromete limite de crédito',
      fonte: exposicao.explicacao,
    };
  }
  const depois = impacto.utilizacaoDepoisPercentual;
  if (depois === null) return null;
  return {
    id: 'utilizacao-apos-aprovacao',
    tom:
      depois > 100
        ? 'critico'
        : depois >= parametros.utilizacaoDeAtencaoPercentual
          ? 'atencao'
          : 'neutro',
    texto: `Após aprovação, utilização do limite ficará em ${formatarPercentual(depois)}`,
    fonte: 'Limite do cadastro e títulos em aberto',
  };
};

/** A premissa por tras da exposicao zero, dita com todas as letras: o pedido so
 *  tem a forma de pagamento escolhida, nao o recebimento nem a autorizacao. */
const sinalDePremissa = ({ exposicao }: EntradaDosSinais): SinalDeDecisao | null => {
  if (exposicao.natureza === 'IMEDIATA') {
    return {
      id: 'recebimento-nao-registrado',
      tom: 'neutro',
      texto: 'O pedido não registra se o pagamento à vista já foi recebido',
      fonte: 'Forma de pagamento do pedido',
    };
  }
  if (exposicao.natureza === 'CARTAO') {
    return {
      id: 'autorizacao-nao-registrada',
      tom: 'neutro',
      texto: 'O pedido não registra a autorização do cartão',
      fonte: 'Forma de pagamento do pedido',
    };
  }
  return null;
};

const sinalDeBloqueio = ({ situacao }: EntradaDosSinais): SinalDeDecisao | null =>
  situacao.bloqueado
    ? {
        id: 'cliente-bloqueado',
        tom: 'critico',
        texto: 'Cadastro do cliente está com a situação financeira bloqueada',
        fonte: 'Cadastro do cliente',
      }
    : null;

const sinalDeUltimoAtraso = ({ comportamento }: EntradaDosSinais): SinalDeDecisao | null => {
  const atraso = comportamento.ultimoAtraso;
  if (!atraso) return null;
  const [ano, mes, dia] = atraso.pagoEm.split('-');
  return {
    id: 'ultimo-atraso',
    tom: 'neutro',
    texto: `Último atraso: título ${atraso.identificacao} pago ${plural(atraso.dias, 'dia', 'dias')} após o vencimento, em ${dia}/${mes}/${ano}`,
    fonte: 'Títulos liquidados',
  };
};

/** Na ordem em que o analista le: bloqueio, divida vencida, limite, historico
 *  e o que foge do habitual. */
export const sinaisDoPedido = (entrada: EntradaDosSinais): readonly SinalDeDecisao[] =>
  [
    sinalDeBloqueio(entrada),
    sinalDeVencidos(entrada),
    sinalDeLimite(entrada),
    sinalDePremissa(entrada),
    sinalDeHistorico(entrada),
    sinalDeTicket(entrada),
    sinalDePrazo(entrada),
    sinalDeUltimoAtraso(entrada),
  ].filter((sinal): sinal is SinalDeDecisao => sinal !== null);
