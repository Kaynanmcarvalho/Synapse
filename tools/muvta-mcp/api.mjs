/** Cliente HTTP da API de workspace do Muvta.
 *  A chave nunca aparece aqui: chega pelo ambiente (MUVTA_API_KEY). */

const DEFAULT_URL = 'https://muvtaapi-production.up.railway.app';

/** A API so aceita http em localhost; qualquer outro host precisa de https. */
const assertTransport = (url) => {
  const { protocol, hostname } = new URL(url);
  if (protocol === 'https:') return;
  if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) return;
  throw new Error(`MUVTA_API_URL precisa ser https (ou http em localhost): ${url}`);
};

export const readConfig = (env = process.env) => {
  const apiKey = env.MUVTA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'MUVTA_API_KEY ausente. Defina a variavel de ambiente antes de iniciar o Claude Code.',
    );
  }
  const baseUrl = (env.MUVTA_API_URL?.trim() || DEFAULT_URL).replace(/\/+$/, '');
  assertTransport(baseUrl);
  return { apiKey, baseUrl };
};

/** Erro de API com o statusCode preservado, para o agente distinguir 409 de 400. */
export class MuvtaApiError extends Error {
  constructor(status, body) {
    const message = typeof body?.message === 'string' ? body.message : `HTTP ${status}`;
    super(message);
    this.name = 'MuvtaApiError';
    this.status = status;
    this.body = body;
  }
}

const HINTS = {
  400: 'Campo invalido, desconhecido ou faltando.',
  401: 'Chave ausente, revogada ou vencida.',
  403: 'Chave somente-consulta, ou rota que exige sessao de navegador.',
  404: 'Projeto ou cartao inexistente — ou sem acesso.',
  409: 'expectedVersion desatualizada: releia o cartao com get_task e tente de novo.',
};

export const createClient = (config) => {
  const request = async (method, path, { query, body } = {}) => {
    const url = new URL(config.baseUrl + '/workspace' + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text.slice(0, 500) };
      }
    }

    if (!response.ok) {
      const hint = HINTS[response.status];
      const error = new MuvtaApiError(response.status, payload);
      if (hint) error.hint = hint;
      throw error;
    }
    return payload;
  };

  return {
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body }),
    patch: (path, body) => request('PATCH', path, { body }),
  };
};
