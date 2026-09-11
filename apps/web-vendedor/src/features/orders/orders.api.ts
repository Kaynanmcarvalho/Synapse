import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export interface OrderItem {
  readonly productId: string;
  readonly barcode: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discount: number;
  readonly surcharge: number;
  readonly total: number;
}

export type OrderStatus =
  'QUOTE' | 'ORDER' | 'APPROVED' | 'PICKING' | 'INVOICED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  readonly id: string;
  readonly branchId: string;
  readonly customerId: string;
  readonly status: OrderStatus;
  readonly total: number;
  readonly requiresApproval: boolean;
  readonly items: readonly OrderItem[];
  readonly createdAt: string;
}

export const listMyOrders = (onlyPending: boolean): Promise<Order[]> =>
  apiRequest(`/field-sales/me/orders${onlyPending ? '?pending=true' : ''}`);

export interface ProductListItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly pricing: { readonly salePrice: number };
}

export const listProducts = (query = ''): Promise<{ items: ProductListItem[] }> =>
  apiRequest(`/catalog/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export interface ResolvedPrice {
  readonly price: number;
  readonly source: string;
  readonly requiresApproval: boolean;
}

export const resolvePrice = (
  productId: string,
  branchId: string,
  customerId: string,
  quantity: number,
): Promise<ResolvedPrice> =>
  apiRequest('/catalog/pricing/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, branchId, customerId, quantity }),
  });

export interface CreateOrderPayload {
  readonly branchId: string;
  readonly customerId: string;
  readonly items: readonly OrderItem[];
}

export const createOrderQuote = (payload: CreateOrderPayload): Promise<Order> =>
  apiRequest('/sales/orders/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, channel: 'SELLER' }),
  });
