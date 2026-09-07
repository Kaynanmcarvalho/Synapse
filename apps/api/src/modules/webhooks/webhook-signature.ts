import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookProvider = 'sicredi' | 'itau' | 'fiscal';

/** Assinatura conferida em tempo constante.
 *
 *  Comparar com `===` vaza o tamanho do prefixo correto pelo tempo de resposta,
 *  e um endpoint publico e exatamente onde alguem tem paciencia para medir isso.
 *  O digest e reduzido a bytes antes da comparacao para os dois lados terem
 *  sempre o mesmo tamanho — `timingSafeEqual` lanca se os tamanhos diferem, e um
 *  throw tambem seria um canal lateral. */
export const assinaturaConfere = (
  corpoCru: string,
  assinaturaRecebida: string | null,
  segredo: string,
): boolean => {
  if (!assinaturaRecebida || !segredo) return false;

  const esperada = createHmac('sha256', segredo).update(corpoCru, 'utf8').digest();
  const recebida = Buffer.from(assinaturaRecebida.replace(/^sha256=/i, ''), 'hex');

  if (recebida.length !== esperada.length) return false;
  return timingSafeEqual(recebida, esperada);
};

export class SegredosDeWebhook {
  private readonly porProvedor = new Map<WebhookProvider, string>();

  constructor() {
    for (const provider of ['sicredi', 'itau', 'fiscal'] as const) {
      const secret = process.env[`WEBHOOK_${provider.toUpperCase()}_SECRET`];
      if (secret) this.porProvedor.set(provider, secret);
    }
  }

  definir(provedor: WebhookProvider, segredo: string): void {
    this.porProvedor.set(provedor, segredo);
  }

  /** Vazio quando nao ha segredo cadastrado — e `assinaturaConfere` recusa. */
  de(provedor: WebhookProvider): string {
    return this.porProvedor.get(provedor) ?? '';
  }
}

/** Como cada provedor manda a assinatura.
 *
 *  HMAC-SHA256 sobre o corpo cru e o esquema mais comum e e o que usamos por
 *  padrao, mas **o esquema real de cada banco vem do contrato oficial** — alguns
 *  assinam corpo mais timestamp, outros usam certificado em vez de segredo
 *  compartilhado. O cabecalho fica configuravel aqui para trocar sem mexer no
 *  resto; ver docs/BANKING.md. */
export const CABECALHO_DA_ASSINATURA: Readonly<Record<WebhookProvider, string>> = {
  sicredi: 'x-sicredi-signature',
  itau: 'x-itau-signature',
  fiscal: 'x-fiscal-signature',
};
