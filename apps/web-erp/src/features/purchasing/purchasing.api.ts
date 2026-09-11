import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export type PurchaseOrderStatus =
  'RASCUNHO' | 'EM_COTACAO' | 'APROVADO' | 'RECEBIDO_PARCIAL' | 'RECEBIDO' | 'CANCELADO';

export interface PurchaseOrderItem {
  readonly productId: string;
  readonly quantityOrdered: number;
  readonly unitCostCentavos: number;
  readonly quantityReceived: number;
}

export interface SupplierQuoteItem {
  readonly productId: string;
  readonly unitCostCentavos: number;
}

export interface SupplierQuote {
  readonly supplierId: string;
  readonly leadDays: number;
  readonly items: readonly SupplierQuoteItem[];
  readonly submittedAt: string;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly status: PurchaseOrderStatus;
  readonly supplierId: string | null;
  readonly items: readonly PurchaseOrderItem[];
  readonly quotes: readonly SupplierQuote[];
  readonly sourceSuggestionIds: readonly string[];
  readonly version: number;
  readonly createdAt: string;
}

export interface ReceivingLine {
  readonly productId: string;
  readonly quantityOrdered: number;
  readonly quantityReceived: number;
  readonly unitCostOrdered: number;
  readonly unitCostReceived: number;
  readonly quantityDivergence: number;
  readonly costDivergence: number;
}

export interface Receiving {
  readonly id: string;
  readonly purchaseOrderId: string;
  readonly lines: readonly ReceivingLine[];
  readonly totalCostCentavos: number;
  readonly tituloId: string | null;
  readonly receivedAt: string;
}

export const listPurchaseOrders = (
  branchId: string,
  status?: PurchaseOrderStatus,
): Promise<PurchaseOrder[]> =>
  apiRequest(
    `/purchasing/orders?branchId=${encodeURIComponent(branchId)}${status ? `&status=${status}` : ''}`,
  );

export const getPurchaseOrder = (id: string): Promise<PurchaseOrder> =>
  apiRequest(`/purchasing/orders/${id}`);

export interface CreatePurchaseOrderPayload {
  readonly branchId: string;
  readonly warehouseId: string;
  readonly items: ReadonlyArray<{ productId: string; quantityOrdered: number }>;
  readonly sourceSuggestionIds?: readonly string[];
}

export const createPurchaseOrder = (payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> =>
  apiRequest('/purchasing/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export interface AddQuotePayload {
  readonly supplierId: string;
  readonly leadDays: number;
  readonly items: readonly SupplierQuoteItem[];
}

export const addQuote = (orderId: string, payload: AddQuotePayload): Promise<PurchaseOrder> =>
  apiRequest(`/purchasing/orders/${orderId}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const selectSupplier = (orderId: string, supplierId: string): Promise<PurchaseOrder> =>
  apiRequest(`/purchasing/orders/${orderId}/select-supplier`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierId }),
  });

export interface ReceiveManualPayload {
  readonly warehouseId: string;
  readonly lines: ReadonlyArray<{
    productId: string;
    quantityReceived: number;
    unitCostReceived: number;
  }>;
}

export const receiveManual = (orderId: string, payload: ReceiveManualPayload): Promise<Receiving> =>
  apiRequest(`/purchasing/orders/${orderId}/receivings/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const receiveFromXml = (
  orderId: string,
  warehouseId: string,
  xml: string,
): Promise<Receiving> =>
  apiRequest(`/purchasing/orders/${orderId}/receivings/xml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ warehouseId, xml }),
  });

export interface PriceHistoryEntry {
  readonly purchaseOrderId: string;
  readonly productId: string;
  readonly unitCostCentavos: number;
  readonly receivedAt: string;
}

export const getSupplierPriceHistory = (supplierId: string): Promise<PriceHistoryEntry[]> =>
  apiRequest(`/purchasing/orders/suppliers/${encodeURIComponent(supplierId)}/price-history`);
