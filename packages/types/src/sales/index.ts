import type { AuditStamp, BranchId, CustomerId, OrderId, ProductId, TenantId } from '../common';

export type OrderStatus =
  'QUOTE' | 'ORDER' | 'APPROVED' | 'PICKING' | 'INVOICED' | 'DELIVERED' | 'CANCELLED';
export type OrderChannel =
  'COUNTER' | 'SELLER' | 'EXTERNAL' | 'PHONE' | 'WHATSAPP' | 'FUTURE_SALE' | 'DELIVERY_ORDER';

export interface Order extends AuditStamp {
  readonly id: OrderId;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly customerId: CustomerId;
  readonly status: OrderStatus;
  readonly total: number;
  readonly channel: OrderChannel;
  readonly requiresApproval: boolean;
  readonly items: readonly PosItem[];
  readonly returnedItems: readonly { productId: ProductId; quantity: number }[];
}

export type PaymentMethod =
  'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'BOLETO' | 'ON_ACCOUNT' | 'WALLET';

export interface PosItem {
  readonly productId: ProductId;
  readonly barcode: string | null;
  readonly description: string;
  /** Quantidade em milésimos; valores monetários em centavos. */
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly surcharge: number;
  readonly total: number;
  /** SKU do produto, como sai no cupom e no pedido. */
  readonly codigo?: string | null;
  readonly unidade?: string | null;
  readonly pesoUnitarioKg?: number | null;
  readonly lote?: string | null;
  /** Número de série do item (botão Série do PDV). */
  readonly serie?: string | null;
}

/** NFC-e emite cupom fiscal; balcão emite o pedido de venda sem valor fiscal. */
export type ModoDoPdv = 'NFCE' | 'BALCAO';

export interface PosPayment {
  readonly method: PaymentMethod;
  readonly amount: number;
  readonly reference: string | null;
  /** A forma de pagamento da tabela ("7 - BONIFICAÇÃO"). */
  readonly formaCodigo?: number | null;
  readonly formaNome?: string | null;
}

export type CashMovementType = 'OPENING' | 'SUPPLY' | 'WITHDRAWAL' | 'SALE' | 'CLOSING';

export interface CashMovement {
  readonly id: string;
  readonly type: CashMovementType;
  readonly amount: number;
  readonly reason: string;
  readonly occurredAt: string;
  readonly operatorId: string;
}

export interface CashSession {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly operatorId: string;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly openingAmount: number;
  readonly expectedCash: number;
  readonly countedCash: number | null;
  readonly difference: number | null;
  readonly movements: readonly CashMovement[];
  /** Depósito que a venda do caixa baixa. */
  readonly warehouseId?: string;
  readonly operatorNome?: string;
}

export interface PosSale {
  readonly id: string;
  readonly cashSessionId: string;
  readonly customerId: CustomerId | null;
  readonly customerTaxId: string | null;
  readonly sellerId: string;
  readonly items: readonly PosItem[];
  readonly payments: readonly PosPayment[];
  readonly subtotal: number;
  readonly discount: number;
  readonly surcharge: number;
  readonly total: number;
  /** Nulo na venda de balcão, que não emite NFC-e. */
  readonly nfceDocumentId: string | null;
  readonly completedAt: string;
  /** Número sequencial da venda no tenant — o "Nº" do cupom e do pedido. */
  readonly numero?: number;
  readonly tenantId?: TenantId;
  readonly branchId?: BranchId;
  readonly modo?: ModoDoPdv;
  readonly vendedorNome?: string | null;
  readonly vendedorCodigo?: number | null;
  readonly clienteNome?: string | null;
  readonly mesaOuCartao?: string | null;
  readonly trocoCentavos?: number;
  readonly situacao?: 'CONCLUIDA' | 'CANCELADA';
  readonly canceladaEm?: string | null;
  readonly canceladaPor?: string | null;
  readonly motivoDoCancelamento?: string | null;
  readonly operadorId?: string;
}
