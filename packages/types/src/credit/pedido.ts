import type { BranchId, CustomerId, ProductId, TenantId, UserId } from '../common';
import type { CodigoDoMotivo, RegistroDaAvaliacao } from './analise';

/** Analise de credito (§26): todo pedido que sai do vendedor — no balcao, no
 *  desktop ou no celular — para aqui antes de virar faturamento. E onde o
 *  financeiro olha o cliente inteiro antes de liberar: o que ele ja comprou, o
 *  que deve, o que pagou e como pagou.
 *
 *  Dinheiro em centavos e quantidade em milesimos, como no resto do sistema. */

export type TipoDePedido =
  'VENDA' | 'BONIFICACAO' | 'TROCA' | 'DEVOLUCAO' | 'CONSIGNACAO' | 'AMOSTRA';

export type SituacaoDoPedido =
  'AGUARDANDO_ANALISE' | 'APROVADO' | 'REPROVADO' | 'FATURADO' | 'CANCELADO';

/** De onde o pedido chegou. O vendedor usa o que tiver na mao; a analise e a
 *  mesma, e a tela precisa mostrar a origem para quem atende saber com quem falar. */
export type OrigemDoPedido = 'DESKTOP' | 'MOBILE' | 'BALCAO' | 'API';

/** Por onde o pedido passa, do balcao ate a porta do cliente. Cada observacao e
 *  cada evento do historico diz em qual etapa aconteceu. */
export type EtapaDoPedido =
  'VENDEDOR' | 'GERENCIA_COMERCIAL' | 'CREDITO' | 'FATURAMENTO' | 'EXPEDICAO';

export type TipoDeEvento =
  | 'LANCADO'
  /** O Synapse avaliou o pedido na chegada e registrou por que ele esta em analise. */
  | 'ANALISE_ACIONADA'
  | 'EDITADO'
  | 'IMPRESSO'
  /** Alguem do credito abriu a analise do pedido. No maximo um por pessoa a cada
   *  meia hora: e rastro de quem olhou, e nao registro de cada renderizacao. */
  | 'VISUALIZADO'
  | 'OBSERVACAO'
  | 'LIBERADO'
  /** Aprovado apesar de ferir a politica de credito, sempre com justificativa. */
  | 'LIBERADO_EXCECAO'
  | 'REPROVADO'
  | 'FATURADO'
  | 'EM_ROTA'
  | 'ENTREGUE';

/** Um valor que a acao mudou, gravado cru (centavos, dias, percentual) para a
 *  auditoria refazer a conta e a tela formatar como quiser. */
export interface ValorRegistrado {
  readonly campo: string;
  readonly rotulo: string;
  readonly unidade: 'centavos' | 'dias' | 'percentual';
  readonly antes: number | null;
  readonly depois: number | null;
}

/** Quem fez o que e quando. O rastro nunca e editado: cada acao acrescenta um
 *  evento, e a historia do pedido se le de cima a baixo. */
export interface EventoDoPedido {
  readonly tipo: TipoDeEvento;
  readonly etapa: EtapaDoPedido;
  readonly em: string;
  readonly porUid: string;
  readonly porNome: string;
  readonly detalhe: string | null;
  /** Obrigatoria na aprovacao excepcional e na reprovacao. */
  readonly justificativa?: string | null;
  /** Motivos que estavam valendo quando a acao aconteceu. */
  readonly motivos?: readonly CodigoDoMotivo[];
  /** Os motivos que feriam a politica — o que a aprovacao excepcional passou por cima. */
  readonly motivosForaDaPolitica?: readonly CodigoDoMotivo[];
  /** O cliente da decisao, gravado no proprio evento: a auditoria le quem,
   *  quando, qual pedido e qual cliente sem depender de outro documento. */
  readonly cliente?: { readonly id: string; readonly nome: string };
  /** Situacao antes e depois da acao: limite, disponivel, utilizacao. */
  readonly valores?: readonly ValorRegistrado[];
}

export interface ObservacaoDoPedido {
  readonly id: string;
  readonly etapa: EtapaDoPedido;
  readonly texto: string;
  readonly em: string;
  readonly porUid: string;
  readonly porNome: string;
}

export interface ItemDoPedido {
  readonly productId: ProductId;
  readonly descricao: string;
  readonly quantidade: number;
  readonly precoUnitarioCentavos: number;
  readonly descontoCentavos: number;
  readonly totalCentavos: number;
  /** SKU, unidade e peso de uma unidade: o que a impressão do pedido mostra. */
  readonly codigo?: string | null;
  readonly unidade?: string | null;
  readonly pesoUnitarioKg?: number | null;
  readonly lote?: string | null;
}

export interface NotaDoPedido {
  readonly numero: number;
  readonly serie: number;
  readonly chaveDeAcesso: string | null;
  readonly emitidaEm: string;
}

/** Quem esta agindo: uid e o nome que aparece no rastro. */
export interface AutorDoRegistro {
  readonly uid: string;
  readonly nome: string;
}

export interface PedidoDeVenda {
  readonly id: string;
  /** Numero sequencial por tenant — e o que o vendedor fala no telefone. */
  readonly numero: number;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly customerId: CustomerId;
  readonly clienteNome: string;
  readonly clienteDocumento: string | null;
  readonly clienteCidade: string | null;
  readonly clienteBairro: string | null;
  readonly tipo: TipoDePedido;
  readonly situacao: SituacaoDoPedido;
  readonly origem: OrigemDoPedido;
  /** O representante comercial — dono da venda e da comissao. */
  readonly vendedorId: UserId | null;
  readonly vendedorNome: string;
  /** O funcionário vendedor (Cadastro de Funcionários), quando o pedido veio do
   *  Ponto de Vendas ou do PDV. Pedido do app do vendedor guarda só o login. */
  readonly funcionarioId?: string | null;
  /** Código do funcionário vendedor, como sai na impressão: "15 - RENIER". */
  readonly vendedorCodigo?: number | null;
  /** O usuario que digitou o pedido (caixa do balcao, backoffice). Pode ser o
   *  proprio vendedor, mas nao e a mesma coisa. Pedido anterior a este campo
   *  guarda a mesma informacao no evento LANCADO do historico. */
  readonly lancadoPor?: AutorDoRegistro | null;
  /** Como foi combinado: "28/35/42 dias", "A vista", "30 dias". */
  readonly condicaoDePagamento: string;
  /** Vencimentos combinados, em dias a partir do faturamento: [14, 21, 28, 35]. */
  readonly vencimentosEmDias: readonly number[];
  /** Media dos vencimentos combinados — o prazo que pesa na analise. */
  readonly prazoMedioEmDias: number;
  readonly formaDePagamento: string;
  /** Valor comercial: itens + frete + acrescimo. */
  readonly totalCentavos: number;
  readonly descontoCentavos: number;
  /** Frete cobrado do cliente, quando o pedido tem. */
  readonly freteCentavos?: number;
  /** Acrescimo financeiro cobrado no pedido, quando tem. */
  readonly acrescimoCentavos?: number;
  /** Parte paga antes do faturamento (entrada, sinal). Nao compromete limite. */
  readonly entradaCentavos?: number;
  readonly itens: readonly ItemDoPedido[];
  readonly observacao: string | null;
  /** Quem ja imprimiu este pedido. A marca e de cada usuario: o que um
   *  imprimiu nao conta como impresso para o outro. */
  readonly impressoPor: readonly UserId[];
  readonly historico: readonly EventoDoPedido[];
  readonly observacoes: readonly ObservacaoDoPedido[];
  readonly nota: NotaDoPedido | null;
  readonly enviadoEm: string;
  readonly analisadoEm: string | null;
  readonly analisadoPor: UserId | null;
  /** Motivos avaliados quando o pedido chegou. Pedido anterior a esta versao nao
   *  tem — e a tela diz isso, em vez de inventar o motivo depois. */
  readonly analiseNoEnvio?: RegistroDaAvaliacao | null;
}

/** Como o cliente esta hoje, em uma linha: e o que decide se o pedido sobe na
 *  fila ou espera. Vem junto da fila para o analista nao precisar abrir um por
 *  um so para descobrir quem esta devendo. */
export interface ResumoFinanceiroDoCliente {
  readonly vencidoCentavos: number;
  readonly aVencerCentavos: number;
  readonly titulosVencidos: number;
  readonly diasDeAtrasoMaximo: number;
}
