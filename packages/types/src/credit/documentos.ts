import type { BankId, BoletoStatus } from '../banking';
import type { FormaDeLiquidacao, TituloStatus } from '../finance';
import type { ClienteDaAnalise } from './analise';
import type {
  AutorDoRegistro,
  EventoDoPedido,
  NotaDoPedido,
  PedidoDeVenda,
  SituacaoDoPedido,
} from './pedido';

// ── Documentos ───────────────────────────────────────────────────────────────

/** Um titulo na lista de outro documento (pedido, nota). */
export interface TituloDoDocumento {
  readonly id: string;
  /** "4388" — numero da nota ou do titulo. */
  readonly numero: string;
  readonly serie: string;
  readonly parcela: string;
  readonly vencimento: string;
  readonly valorOriginalCentavos: number;
  readonly saldoCentavos: number;
  readonly situacao: TituloStatus;
}

export interface DetalheDoPedido {
  readonly pedido: PedidoDeVenda;
  /** Quem digitou o pedido: do campo, ou do evento LANCADO nos pedidos antigos. */
  readonly lancadoPor: AutorDoRegistro | null;
  readonly titulos: readonly TituloDoDocumento[];
}

export interface DetalheDaNota {
  readonly pedidoId: string;
  readonly pedidoNumero: number;
  readonly pedidoSituacao: SituacaoDoPedido;
  readonly numero: number;
  readonly serie: number;
  readonly chaveDeAcesso: string | null;
  readonly emitidaEm: string;
  readonly cliente: ClienteDaAnalise;
  readonly vendedorNome: string;
  /** Soma bruta dos itens (quantidade x preco), antes do desconto. */
  readonly produtosCentavos: number;
  readonly descontoCentavos: number;
  readonly freteCentavos: number | null;
  readonly totalCentavos: number;
  readonly titulos: readonly TituloDoDocumento[];
  /** Eventos do faturamento registrados no pedido. */
  readonly eventos: readonly EventoDoPedido[];
  /** O Synapse ainda nao guarda o XML nem o status da SEFAZ ligado ao pedido. */
  readonly situacaoFiscal: string | null;
  readonly xmlDisponivel: boolean;
  readonly danfeDisponivel: boolean;
}

export interface LiquidacaoDoTitulo {
  readonly id: string;
  readonly data: string;
  readonly valorCentavos: number;
  readonly forma: FormaDeLiquidacao;
  readonly referenciaBancaria: string | null;
  readonly observacao: string | null;
  readonly registradoPor: string;
  readonly registradoPorNome: string | null;
  readonly registradoEm: string;
  /** Dias da liquidacao em relacao ao vencimento (negativo = antes). */
  readonly diasEmRelacaoAoVencimento: number;
}

/** So o que tem data gravada: cancelamento e renegociacao aparecem na situacao
 *  do titulo, porque o Synapse nao registra quando aconteceram. */
export type TipoDeEventoDoTitulo = 'CRIADO' | 'LIQUIDACAO' | 'BOLETO_EMITIDO';

export interface EventoDoTitulo {
  readonly em: string;
  readonly tipo: TipoDeEventoDoTitulo;
  readonly descricao: string;
  readonly detalhe: string | null;
}

export type SituacaoDoBoletoNoSynapse = 'PENDING' | 'REGISTERED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface EventoDoBoleto {
  readonly em: string;
  readonly descricao: string;
  /** Codigo original do banco/integracao, quando houver. */
  readonly codigo: string | null;
  readonly detalhe: string | null;
}

export interface DetalheDoBoleto {
  readonly id: string;
  readonly bancoId: BankId | null;
  readonly contaApelido: string | null;
  readonly carteira: string | null;
  readonly nossoNumero: string | null;
  /** "Seu numero": a referencia que o Synapse mandou ao banco. */
  readonly numeroDoDocumento: string;
  readonly linhaDigitavel: string | null;
  readonly valorCentavos: number;
  readonly emitidoEm: string;
  readonly vencimento: string;
  readonly situacao: SituacaoDoBoletoNoSynapse;
  readonly situacaoNoBanco: BoletoStatus | null;
  readonly multaPercentual: number | null;
  readonly jurosMensalPercentual: number | null;
  readonly descontoCentavos: number | null;
  readonly pdfDisponivel: boolean;
  /** Como o boleto chegou ao banco. O Synapse registra por API; CNAB nao existe. */
  readonly integracao: 'API';
  readonly eventos: readonly EventoDoBoleto[];
}

export interface DetalheDoTitulo {
  readonly id: string;
  readonly descricao: string;
  readonly numero: string;
  readonly serie: string;
  readonly parcela: string;
  readonly pedidoId: string | null;
  readonly pedidoNumero: number | null;
  readonly pedidoSituacao: SituacaoDoPedido | null;
  readonly nota: NotaDoPedido | null;
  readonly emitidoEm: string;
  readonly vencimento: string;
  readonly valorOriginalCentavos: number;
  readonly recebidoCentavos: number;
  readonly saldoCentavos: number;
  readonly situacao: TituloStatus;
  /** Dias ate vencer (positivo) ou em atraso (negativo); null se quitado. */
  readonly diasParaVencer: number | null;
  /** Data em que o saldo zerou, quando quitado. */
  readonly quitadoEm: string | null;
  readonly formaDeCobranca: 'BOLETO' | null;
  readonly liquidacoes: readonly LiquidacaoDoTitulo[];
  readonly eventos: readonly EventoDoTitulo[];
  readonly boleto: DetalheDoBoleto | null;
  readonly renegociadoDe: string | null;
  readonly renegociadoPara: readonly string[];
}
