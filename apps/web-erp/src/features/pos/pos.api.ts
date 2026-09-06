import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export type PaymentMethod =
  'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'BOLETO' | 'ON_ACCOUNT' | 'WALLET';

export interface CashMovement {
  readonly id: string;
  readonly type: 'OPENING' | 'SUPPLY' | 'WITHDRAWAL' | 'SALE' | 'CLOSING';
  readonly amount: number;
  readonly reason: string;
  readonly occurredAt: string;
  readonly operatorId: string;
}

export interface CashSession {
  readonly id: string;
  readonly branchId: string;
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly openingAmount: number;
  readonly expectedCash: number;
  readonly countedCash: number | null;
  readonly difference: number | null;
  readonly movements: readonly CashMovement[];
}

export const getCurrentSession = (branchId: string): Promise<CashSession | null> =>
  apiRequest(`/sales/pos/cash-sessions/current?branchId=${encodeURIComponent(branchId)}`);

export const openCash = (branchId: string, openingAmount: number): Promise<CashSession> =>
  apiRequest('/sales/pos/cash-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchId, openingAmount }),
  });

export const addCashMovement = (
  sessionId: string,
  kind: 'supply' | 'withdrawal',
  amount: number,
  reason: string,
): Promise<CashSession> =>
  apiRequest(`/sales/pos/cash-sessions/${sessionId}/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, reason }),
  });

export const closeCash = (sessionId: string, countedCash: number): Promise<CashSession> =>
  apiRequest(`/sales/pos/cash-sessions/${sessionId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countedCash }),
  });

export interface ProductListItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly ean: string | null;
  readonly pricing: { readonly salePrice: number };
}

export const searchProducts = (q: string): Promise<{ items: ProductListItem[] }> =>
  apiRequest(`/catalog/products?q=${encodeURIComponent(q)}&limit=8`);

export interface ResolvedPrice {
  readonly price: number;
  readonly source: string;
  readonly requiresApproval: boolean;
}

export const resolvePrice = (
  productId: string,
  branchId: string,
  quantity: number,
): Promise<ResolvedPrice> =>
  apiRequest('/catalog/pricing/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, branchId, quantity }),
  });

export interface CustomerListItem {
  readonly id: string;
  readonly name: string;
  readonly taxId: string;
}

export const searchCustomers = (q: string): Promise<CustomerListItem[]> =>
  apiRequest(`/catalog/partners/customers?q=${encodeURIComponent(q)}`);

export interface PosItemInput {
  readonly productId: string;
  readonly barcode: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly surcharge: number;
}

export interface PosPaymentInput {
  readonly method: PaymentMethod;
  readonly amount: number;
  readonly reference?: string | null;
}

export interface PosSale {
  readonly id: string;
  readonly cashSessionId: string;
  readonly customerId: string | null;
  readonly customerTaxId: string | null;
  readonly sellerId: string;
  readonly total: number;
  readonly nfceDocumentId: string;
  readonly completedAt: string;
}

export const completeSale = (
  sessionId: string,
  payload: {
    readonly customerId?: string | null;
    readonly customerTaxId?: string | null;
    readonly sellerId: string;
    readonly items: readonly PosItemInput[];
    readonly payments: readonly PosPaymentInput[];
  },
): Promise<PosSale> =>
  apiRequest(`/sales/pos/cash-sessions/${sessionId}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export interface BranchItem {
  readonly id: string;
  readonly name: string;
  readonly isHeadquarters: boolean;
}

export const listBranches = (): Promise<BranchItem[]> => apiRequest('/iam/branches');
