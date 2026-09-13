import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { mensagemDeErroDaSessao, mensagemDeErroDeLogin } from '../app/auth/erros';

/** Autenticacao de dev compartilhada pelas telas que ainda nao dependem do
 *  AuthService de producao (MFA, App Check real) — fala direto com o emulador do
 *  Firebase Auth (127.0.0.1:9099). A API, rodando contra o mesmo emulador
 *  (`pnpm dev`), dispensa o App Check. O usuario de teste e criado por
 *  scripts/seed-dev.mjs. */
const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-synapse', appId: 'demo-app' });
let auth: Auth | null = null;
let sessionId: string | null = null;
let restauracao: Promise<UsuarioDaSessao | null> | null = null;
let encerrando = false;

export const API_URL = 'http://localhost:3333/api/v1';

export interface UsuarioDaSessao {
  readonly uid: string;
  readonly email: string;
  readonly nome: string;
}

const CHAVE_DO_DISPOSITIVO = 'synapse.dispositivo';
const chaveDaSessao = (uid: string) => `synapse.sessao.${uid}`;

/** localStorage pode estar bloqueado (modo privado): ai a sessao vale so nesta aba. */
const armazenamento = {
  ler: (chave: string): string | null => {
    try {
      return window.localStorage.getItem(chave);
    } catch {
      return null;
    }
  },
  gravar: (chave: string, valor: string | null): void => {
    try {
      if (valor === null) window.localStorage.removeItem(chave);
      else window.localStorage.setItem(chave, valor);
    } catch {
      // Segue so em memoria.
    }
  },
};

const getDevAuth = (): Auth => {
  if (auth) return auth;
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  return auth;
};

/** Mesmo navegador, mesmo dispositivo: a lista de sessoes do usuario nao ganha
 *  uma entrada nova a cada login. */
const identificadorDoDispositivo = (): string => {
  const existente = armazenamento.ler(CHAVE_DO_DISPOSITIVO);
  if (existente) return existente;
  const novo = `web-erp-${crypto.randomUUID()}`;
  armazenamento.gravar(CHAVE_DO_DISPOSITIVO, novo);
  return novo;
};

const paraUsuario = (user: User): UsuarioDaSessao => {
  const email = user.email ?? '';
  return {
    uid: user.uid,
    email,
    nome: user.displayName?.trim() || email.split('@')[0] || 'Usuário',
  };
};

/** A API exige uma sessao de dispositivo em toda rota com tenant. */
const abrirSessaoDeDispositivo = async (user: User): Promise<string> => {
  const idToken = await user.getIdToken();
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}/auth/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: identificadorDoDispositivo(),
        name: 'Web ERP',
        platform: 'web',
      }),
    });
  } catch {
    throw new Error(
      'Não foi possível falar com o servidor do Synapse. Verifique se a API está no ar.',
    );
  }
  const corpo = (await resposta.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!resposta.ok || !corpo.id)
    throw new Error(mensagemDeErroDaSessao(resposta.status, corpo.message));
  return corpo.id;
};

/** Depois de recarregar, reaproveita a sessao guardada; num login explicito,
 *  abre uma nova — uma sessao velha revogada derrubaria o usuario logo apos entrar. */
const ativarSessao = async (user: User, reaproveitar: boolean): Promise<UsuarioDaSessao> => {
  try {
    const guardada = reaproveitar ? armazenamento.ler(chaveDaSessao(user.uid)) : null;
    const id = guardada ?? (await abrirSessaoDeDispositivo(user));
    sessionId = id;
    armazenamento.gravar(chaveDaSessao(user.uid), id);
    return paraUsuario(user);
  } catch (erro) {
    await signOut(getDevAuth()).catch(() => undefined);
    throw erro;
  }
};

/** Recupera o login ao abrir ou recarregar a pagina. Uma consulta por carga. */
export const restaurarSessao = (): Promise<UsuarioDaSessao | null> => {
  restauracao ??= new Promise<User | null>((resolve, reject) => {
    const parar = onAuthStateChanged(
      getDevAuth(),
      (user) => {
        parar();
        resolve(user);
      },
      reject,
    );
  }).then((user) => (user ? ativarSessao(user, true) : null));
  return restauracao;
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

export const currentUid = (): string | null => getDevAuth().currentUser?.uid ?? null;

export const devSignIn = async (email: string, password: string): Promise<UsuarioDaSessao> => {
  let user: User;
  try {
    user = (await signInWithEmailAndPassword(getDevAuth(), email, password)).user;
  } catch (erro) {
    throw new Error(mensagemDeErroDeLogin((erro as { code?: string }).code));
  }
  restauracao = null;
  encerrando = false;
  return ativarSessao(user, false);
};

/** "Sair": revoga a sessao no servidor e so depois encerra o Firebase. Apagar o
 *  token so neste navegador deixaria a sessao valida para quem a tivesse copiado. */
export const devSignOut = async (): Promise<void> => {
  // Requisicoes que ainda estavam no ar voltam 401 depois da revogacao: nao sao
  // "sessao perdida", e o login nao deve dizer que a sessao terminou sozinha.
  encerrando = true;
  const user = getDevAuth().currentUser;
  const id = sessionId;
  sessionId = null;
  restauracao = null;
  if (user) {
    armazenamento.gravar(chaveDaSessao(user.uid), null);
    if (id) {
      await user
        .getIdToken()
        .then((token) =>
          fetch(`${API_URL}/auth/sessions/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, 'X-Device-Session': id },
          }),
        )
        .catch(() => undefined);
    }
  }
  await signOut(getDevAuth());
};

type Ouvinte = () => void;
const ouvintesDeSessaoPerdida = new Set<Ouvinte>();

/** Avisado quando a API recusa a sessao (revogada, usuario bloqueado, tenant
 *  removido): a interface volta ao login em vez de mostrar erro em cada tela. */
export const aoPerderSessao = (ouvinte: Ouvinte): (() => void) => {
  ouvintesDeSessaoPerdida.add(ouvinte);
  return () => {
    ouvintesDeSessaoPerdida.delete(ouvinte);
  };
};

const avisarSessaoPerdida = (): void => {
  // Varias telas recebem 401 ao mesmo tempo: o login so precisa acontecer uma vez.
  if (encerrando) return;
  encerrando = true;
  const uid = getDevAuth().currentUser?.uid;
  if (uid) armazenamento.gravar(chaveDaSessao(uid), null);
  sessionId = null;
  ouvintesDeSessaoPerdida.forEach((ouvinte) => ouvinte());
};

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    if (response.status === 401) avisarSessaoPerdida();
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
};
