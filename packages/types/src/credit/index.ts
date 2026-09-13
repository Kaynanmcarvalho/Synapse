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
  /** Media dos vencimentos combinados — o prazo que pesa na analise. */
  readonly prazoMedioEmDias: number;
  readonly formaDePagamento: string;
  readonly totalCentavos: number;
  readonly descontoCentavos: number;
  readonly itens: readonly ItemDoPedido[];
  readonly observacao: string | null;
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
}

export interface TituloEmAberto {
  readonly id: string;
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
