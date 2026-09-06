import { API_URL, apiRequest, authHeaders } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export interface ProductListItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly status: string;
  readonly photoUrl: string | null;
  readonly pricing: { readonly salePrice: number };
}

export const listProducts = (query = ''): Promise<{ items: ProductListItem[] }> =>
  apiRequest(`/catalog/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export interface CreateProductPayload {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly ncm: string;
  readonly defaultCfop: string;
  readonly cost: number;
  readonly salePrice: number;
}

export const createProduct = (payload: CreateProductPayload): Promise<ProductListItem> =>
  apiRequest('/catalog/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: payload.sku,
      name: payload.name,
      logistics: { unit: payload.unit },
      pricing: {
        cost: payload.cost,
        averageCost: payload.cost,
        lastCost: payload.cost,
        salePrice: payload.salePrice,
        marginPercent:
          payload.salePrice === 0
            ? 0
            : ((payload.salePrice - payload.cost) / payload.salePrice) * 100,
      },
      fiscal: { ncm: payload.ncm, defaultCfop: payload.defaultCfop, origin: 0 },
    }),
  });

export const uploadProductPhoto = async (
  productId: string,
  file: File,
): Promise<ProductListItem> => {
  const headers = await authHeaders();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_URL}/catalog/products/${productId}/photo`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<ProductListItem>;
};

export interface ResolvedPrice {
  readonly price: number;
  readonly source: string;
  readonly requiresApproval: boolean;
}

export const resolvePrice = (productId: string, branchId: string | null): Promise<ResolvedPrice> =>
  apiRequest('/catalog/pricing/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, branchId, quantity: 1 }),
  });
