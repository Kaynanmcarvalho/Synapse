import type { OrigemDoPedido, PedidoDeVenda, SituacaoDoPedido, TipoDePedido } from '@synapse/types';

/** Formatacoes e rotulos da analise de credito. Ficam fora dos componentes
 *  porque sao regra de leitura — e o que o analista entende por "vencido ha 14
 *  dias" ou "pago 3 dias adiantado" — e precisam de teste. */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (centavos: number): string => MOEDA.format(centavos / 100);

/** Data em ISO curta (2026-09-01) ou instante completo.
 *
 *  Data pura nunca passa pelo construtor do Date: '2026-09-01' viraria 31/08 em
 *  qualquer fuso a oeste. Instante completo, ao contrario, precisa virar o dia
 *  local — mostrar o dia de Greenwich com a hora daqui faz um pedido das 22h
 *  parecer do dia seguinte, e nenhum filtro de periodo bate com isso. */
export const formatarData = (iso: string): string => {
  if (iso.length > 10) {
    const instante = new Date(iso);
    if (!Number.isNaN(instante.getTime())) return instante.toLocaleDateString('pt-BR');
  }
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
};

export const formatarDataHora = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? formatarData(iso)
    : `${formatarData(iso)} ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export const ROTULO_DO_TIPO: Record<TipoDePedido, string> = {
  VENDA: 'Venda',
  BONIFICACAO: 'Bonificação',
  TROCA: 'Troca',
  DEVOLUCAO: 'Devolução',
  CONSIGNACAO: 'Consignação',
  AMOSTRA: 'Amostra',
};

export const ROTULO_DA_ORIGEM: Record<OrigemDoPedido, string> = {
  DESKTOP: 'Desktop',
  MOBILE: 'Mobile',
  BALCAO: 'Balcão',
  API: 'Integração',
};

export const ROTULO_DA_SITUACAO: Record<SituacaoDoPedido, string> = {
  AGUARDANDO_ANALISE: 'Aguardando análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  FATURADO: 'Faturado',
  CANCELADO: 'Cancelado',
};

const plural = (quantidade: number, singular: string, plural_: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : plural_}`;

/** Titulo em aberto: quanto tempo passou do vencimento. */
export const descricaoDoAtraso = (diasDeAtraso: number): string =>
  diasDeAtraso <= 0 ? 'A vencer' : `${plural(diasDeAtraso, 'dia', 'dias')} em atraso`;

/** Titulo pago: 0 e no dia, negativo e adiantado, positivo e atraso. */
export const descricaoDoPagamento = (diasDoPagamento: number): string => {
  if (diasDoPagamento === 0) return 'Em dia';
  if (diasDoPagamento < 0) return `${plural(-diasDoPagamento, 'dia', 'dias')} adiantado`;
  return `${plural(diasDoPagamento, 'dia', 'dias')} de atraso`;
};

export const prazoDoPedido = (pedido: PedidoDeVenda): string =>
  pedido.prazoMedioEmDias > 0 ? `${pedido.prazoMedioEmDias} dias` : 'À vista';

/** Quantidade chega em milesimos: 1500 e uma unidade e meia. */
export const formatarQuantidade = (milesimos: number): string =>
  (milesimos / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

/** CNPJ e CPF com a mascara que o pessoal le no telefone. Comprimento errado
 *  volta como veio: mascara inventada confunde mais do que ajuda. */
export const formatarDocumento = (documento: string | null): string => {
  const digitos = (documento ?? '').replace(/\D/g, '');
  if (digitos.length === 14)
    return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (digitos.length === 11)
    return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return documento ?? '';
};

export const resumoDoPedido = (pedido: PedidoDeVenda): string =>
  [
    ROTULO_DO_TIPO[pedido.tipo],
    pedido.condicaoDePagamento,
    plural(pedido.itens.length, 'item', 'itens'),
  ].join(' · ');

/** Coluna "Pagamento" dos titulos pagos: o numero cru (-6) nao diz nada a quem
 *  le; "6 dias antes" diz. O numero continua nos calculos. */
export const pagamentoRelativo = (dias: number): string => {
  if (dias === 0) return 'No vencimento';
  return dias < 0 ? `${plural(-dias, 'dia', 'dias')} antes` : `${plural(dias, 'dia', 'dias')} após`;
};

/** A mesma leitura, por extenso, para o detalhe da liquidacao. */
export const pagamentoPorExtenso = (dias: number): string => {
  if (dias === 0) return 'Pago no vencimento';
  return dias < 0
    ? `${plural(-dias, 'dia', 'dias')} antecipado`
    : `${plural(dias, 'dia', 'dias')} em atraso`;
};

/** Ha quanto tempo o pedido espera: "12 min", "2 h 15 min", "3 dias". */
export const tempoAguardando = (desde: string, agora: Date = new Date()): string => {
  const minutos = Math.max(0, Math.floor((agora.getTime() - Date.parse(desde)) / 60_000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return minutos % 60 ? `${horas} h ${minutos % 60} min` : `${horas} h`;
  return plural(Math.floor(horas / 24), 'dia', 'dias');
};

export const formatarPercentual = (valor: number): string =>
  `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Hoje no calendario de quem esta olhando: a data-base da simulacao. */
export const hojeLocal = (agora: Date = new Date()): string => {
  const mes = `${agora.getMonth() + 1}`.padStart(2, '0');
  const dia = `${agora.getDate()}`.padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
};
