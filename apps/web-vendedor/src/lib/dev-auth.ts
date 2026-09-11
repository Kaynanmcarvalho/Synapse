import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, type Auth } from 'firebase/auth';
import { env } from './env';

/** Mesmo bootstrap de dev do web-erp — fala direto com o emulador do
 *  Firebase Auth (127.0.0.1:9099) em vez do AuthService de produção. */
const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-synapse', appId: 'demo-app' });
let auth: Auth | null = null;
let sessionId: string | null = null;

export const API_URL = env.apiUrl;

const getDevAuth = (): Auth => {
  if (auth) return auth;
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
};

export const authHeaders = async (): Promise<Record<string, string>> => {
  const user = getDevAuth().currentUser;
  if (!user) throw new Error('Faça login primeiro');
  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    ...(sessionId ? { 'X-Device-Session': sessionId } : {}),
  };
};

export const isSignedIn = (): boolean => Boolean(getDevAuth().currentUser) && Boolean(sessionId);

export const devSignIn = async (email: string, password: string): Promise<void> => {
  await signInWithEmailAndPassword(getDevAuth(), email, password);
  const idToken = await getDevAuth().currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/auth/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: `web-vendedor-${Date.now()}`,
      name: 'Portal do Vendedor',
      platform: 'web',
    }),
  });
  const session = (await response.json()) as { id?: string };
  sessionId = session.id ?? null;
};

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
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
