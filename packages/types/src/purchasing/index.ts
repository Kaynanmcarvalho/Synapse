import type { BranchId, ProductId, SupplierId, TenantId, UserId } from '../common';

/** RASCUNHO -> EM_COTACAO -> APROVADO -> RECEBIDO_PARCIAL|RECEBIDO. CANCELADO
 *  interrompe o fluxo em qualquer ponto antes do recebimento. */
export type PurchaseOrderStatus =
  'RASCUNHO' | 'EM_COTACAO' | 'APROVADO' | 'RECEBIDO_PARCIAL' | 'RECEBIDO' | 'CANCELADO';

export interface PurchaseOrderItem {
  readonly productId: ProductId;
  readonly quantityOrdered: number;
  /** Preenchido quando o pedido sai de EM_COTACAO — o custo do fornecedor
   *  vencedor para este item. Em centavos, como o resto do financeiro. */
  readonly unitCostCentavos: number;
  readonly quantityReceived: number;
}

export interface SupplierQuoteItem {
  readonly productId: ProductId;
  readonly unitCostCentavos: number;
}

/** Uma cotação de um fornecedor para o pedido inteiro (§40 "cotação com mais
 *  de um fornecedor"). O pedido guarda todas as recebidas; só uma vence. */
export interface SupplierQuote {
  readonly supplierId: SupplierId;
  readonly leadDays: number;
  readonly items: readonly SupplierQuoteItem[];
  readonly submittedAt: string;
  readonly submittedBy: UserId;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly warehouseId: string;
  readonly status: PurchaseOrderStatus;
  /** Nulo até uma cotação ser selecionada em EM_COTACAO -> APROVADO. */
  readonly supplierId: SupplierId | null;
  readonly items: readonly PurchaseOrderItem[];
  readonly quotes: readonly SupplierQuote[];
  /** Ids de StockIntelligenceMetric que originaram este pedido (§39 "vira
   *  pedido"), vazio quando o pedido foi criado manualmente. */
  readonly sourceSuggestionIds: readonly string[];
  readonly version: number;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly approvedAt: string | null;
  readonly approvedBy: UserId | null;
}

export type ReceivingSourceKind = 'MANUAL' | 'XML_DFE';

export interface ReceivingLine {
  readonly productId: ProductId;
  readonly quantityOrdered: number;
  readonly quantityReceived: number;
  readonly unitCostOrdered: number;
  readonly unitCostReceived: number;
  /** received - ordered. Positivo = veio mais do que o pedido, negativo = menos. */
  readonly quantityDivergence: number;
  /** (unitCostReceived - unitCostOrdered) * quantityReceived, em centavos. */
  readonly costDivergence: number;
}

/** O recebimento de um pedido (§40): confere pedido x nota, aplica no
 *  estoque, atualiza custo médio e gera o título a pagar. */
export interface Receiving {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly warehouseId: string;
  readonly purchaseOrderId: string;
  readonly supplierId: SupplierId;
  readonly source: ReceivingSourceKind;
  /** Chave de acesso do DF-e (44 dígitos), quando source = XML_DFE. */
  readonly xmlAccessKey: string | null;
  readonly lines: readonly ReceivingLine[];
  readonly totalCostCentavos: number;
  /** Id do Titulo (tipo PAGAR) gerado no financeiro para este recebimento. */
  readonly tituloId: string | null;
  readonly receivedAt: string;
  readonly receivedBy: UserId;
}

/** Um item extraído de uma NF-e de entrada (§40 "reaproveitar a entrada por
 *  XML do DF-e") — a ponte entre o parser de XML e o recebimento. */
export interface ParsedDfeItem {
  readonly code: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitCostCentavos: number;
}

export interface ParsedDfe {
  readonly accessKey: string;
  readonly issuerTaxId: string;
  readonly issuedAt: string;
  readonly items: readonly ParsedDfeItem[];
}
