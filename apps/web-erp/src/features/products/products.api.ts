import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, type Auth } from 'firebase/auth';

/** Bootstrap de dev para esta tela: fala direto com o emulador do Firebase
 *  Auth (127.0.0.1:9099), sem exigir projeto real nem App Check — o backend
 *  ja aceita isso fora de producao (APP_CHECK_ENFORCEMENT=false). O login de
 *  producao, com MFA e App Check de verdade, e o AuthService em
 *  features/auth — esta tela nao o substitui, so evita depender dele para
 *  demonstrar o cadastro de produtos e o motor de precos. */
const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-synapse', appId: 'demo-app' });
let auth: Auth | null = null;

const getDevAuth = (): Auth => {
  if (auth) return auth;
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
};

const API_URL = 'http://localhost:3333/api/v1';

let sessionId: string | null = null;

const authHeaders = async (): Promise<Record<string, string>> => {
  const user = getDevAuth().currentUser;
  if (!user) throw new Error('Faca login primeiro');
  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    ...(sessionId ? { 'X-Device-Session': sessionId } : {}),
  };
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
};

/** Login de dev + registro da sessao de dispositivo (X-Device-Session e
 *  exigido pelo DeviceSessionGuard em toda rota de negocio). */
export const devSignIn = async (email: string, password: string): Promise<void> => {
  await signInWithEmailAndPassword(getDevAuth(), email, password);
  const idToken = await getDevAuth().currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/auth/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: `web-erp-${Date.now()}`, name: 'Web ERP', platform: 'web' }),
  });
  const session = (await response.json()) as { id?: string };
  sessionId = session.id ?? null;
};

export const isSignedIn = (): boolean => Boolean(getDevAuth().currentUser) && Boolean(sessionId);

export interface ProductListItem {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly status: string;
  readonly photoUrl: string | null;
  readonly pricing: { readonly salePrice: number };
}

export const listProducts = (query = ''): Promise<{ items: ProductListItem[] }> =>
  request(`/catalog/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);

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
  request('/catalog/products', {
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
  request('/catalog/pricing/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, branchId, quantity: 1 }),
  });
