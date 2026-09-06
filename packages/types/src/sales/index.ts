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
}

export interface PosPayment {
  readonly method: PaymentMethod;
  readonly amount: number;
  readonly reference: string | null;
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
  readonly nfceDocumentId: string;
  readonly completedAt: string;
}
