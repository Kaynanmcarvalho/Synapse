import type { Address, CustomerType } from '../catalog';
import type { BranchId, CustomerId, ProductId, TenantId, UserId } from '../common';

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
  | 'EDITADO'
  | 'IMPRESSO'
  | 'OBSERVACAO'
  | 'LIBERADO'
  | 'REPROVADO'
  | 'FATURADO'
  | 'EM_ROTA'
  | 'ENTREGUE';

/** Quem fez o que e quando. O rastro nunca e editado: cada acao acrescenta um
 *  evento, e a historia do pedido se le de cima a baixo. */
export interface EventoDoPedido {
  readonly tipo: TipoDeEvento;
  readonly etapa: EtapaDoPedido;
  readonly em: string;
  readonly porUid: string;
  readonly porNome: string;
  readonly detalhe: string | null;
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
}

export interface NotaDoPedido {
  readonly numero: number;
  readonly serie: number;
  readonly chaveDeAcesso: string | null;
  readonly emitidaEm: string;
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
  readonly vendedorId: UserId | null;
  readonly vendedorNome: string;
  /** Como foi combinado: "28/35/42 dias", "A vista", "30 dias". */
  readonly condicaoDePagamento: string;
  /** Vencimentos combinados, em dias a partir do faturamento: [14, 21, 28, 35]. */
  readonly vencimentosEmDias: readonly number[];
  /** Media dos vencimentos combinados — o prazo que pesa na analise. */
  readonly prazoMedioEmDias: number;
  readonly formaDePagamento: string;
  readonly totalCentavos: number;
  readonly descontoCentavos: number;
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

export interface PedidoNaFila {
  readonly pedido: PedidoDeVenda;
  readonly cliente: ResumoFinanceiroDoCliente;
  /** Se quem esta pedindo a fila ja imprimiu este pedido. */
  readonly impresso: boolean;
}

export interface TituloEmAberto {
  readonly id: string;
  /** Pedido que gerou o titulo, quando houver — e por ele que a lupa abre. */
  readonly pedidoId: string | null;
  readonly numero: string;
  readonly serie: string;
  /** "2/3": a mesma nota gera varias parcelas, e o cliente cobra pela parcela. */
  readonly parcela: string;
  readonly vencimento: string;
  readonly valorCentavos: number;
  readonly saldoCentavos: number;
  /** Dias de atraso; 0 quando ainda nao venceu. */
  readonly diasDeAtraso: number;
}

export interface PagamentoDoCliente {
  readonly tituloId: string;
  readonly pedidoId: string | null;
  readonly numero: string;
  readonly serie: string;
  readonly parcela: string;
  readonly vencimento: string;
  readonly pagoEm: string;
  readonly valorCentavos: number;
  /** 0 pagou no dia do vencimento; negativo pagou adiantado; positivo, atrasado. */
  readonly diasDoPagamento: number;
}

export interface NotaDoCliente {
  readonly pedidoId: string;
  readonly numero: number;
  readonly serie: number;
  readonly chaveDeAcesso: string | null;
  readonly emitidaEm: string;
  readonly totalCentavos: number;
}

export interface CarteiraDoCliente {
  readonly titulosEmAberto: readonly TituloEmAberto[];
  readonly totalVencidoCentavos: number;
  readonly totalAVencerCentavos: number;
  readonly pagamentos: readonly PagamentoDoCliente[];
  readonly totalPagoCentavos: number;
}

export interface ClienteDaAnalise {
  readonly id: CustomerId;
  readonly nome: string;
  readonly documento: string | null;
}

export interface PainelDeAnaliseDeCredito {
  readonly cliente: ClienteDaAnalise;
  readonly pedidosEmAnalise: readonly PedidoDeVenda[];
  readonly totalEmAnaliseCentavos: number;
  readonly ultimosPedidos: readonly PedidoDeVenda[];
  readonly ultimasNotas: readonly NotaDoCliente[];
  readonly carteira: CarteiraDoCliente;
}

/** Resultado da liberacao em lote: o que passou e o que ficou, com o motivo. */
export interface ResultadoDaLiberacao {
  readonly liberados: readonly string[];
  readonly recusados: readonly { readonly pedidoId: string; readonly motivo: string }[];
}

/** O cadastro do cliente que o credito le e corrige. Os campos tem os mesmos
 *  nomes do `Customer` do catalogo: e o mesmo registro, visto pelo credito. */
export interface CadastroDoCliente {
  readonly id: CustomerId;
  readonly type: CustomerType;
  readonly name: string;
  readonly legalName: string | null;
  readonly taxId: string;
  readonly stateRegistration: string | null;
  readonly phone: string;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly address: Address;
  /** Limite de credito, em centavos. */
  readonly creditLimit: number;
  readonly updatedAt: string | null;
  readonly updatedByName: string | null;
}
