import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebhookInbox, chaveDeIdempotencia } from './webhook-inbox';
import { FilaDeWebhooks } from './webhook-queue';
import {
  assinaturaConfere,
  CABECALHO_DA_ASSINATURA,
  SegredosDeWebhook,
  type WebhookProvider,
} from './webhook-signature';

export interface RespostaDeWebhook {
  readonly recebido: true;
  readonly eventoId: string;
  readonly duplicado: boolean;
}

const idDoProvedor = (corpoCru: string): string | null => {
  try {
    const corpo = JSON.parse(corpoCru) as Record<string, unknown>;
    for (const campo of ['eventId', 'id', 'idEvento', 'notificationId']) {
      const valor = corpo[campo];
      if (typeof valor === 'string' && valor.length > 0) return valor;
    }
  } catch {
    // Corpo que nao e JSON cai no hash: o registro acontece de qualquer jeito.
  }
  return null;
};

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly inbox: WebhookInbox,
    private readonly fila: FilaDeWebhooks,
    private readonly segredos: SegredosDeWebhook,
  ) {}

  async receber(
    provedor: WebhookProvider,
    corpoCru: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<RespostaDeWebhook> {
    const assinatura = headers[CABECALHO_DA_ASSINATURA[provedor]] ?? null;
    const chave = chaveDeIdempotencia(provedor, corpoCru, idDoProvedor(corpoCru));

    // Assinatura invalida: registra a tentativa e devolve 401 (c26-7). O
    // registro e o que revela alguem sondando a porta mais exposta do sistema.
    if (!assinaturaConfere(corpoCru, assinatura, this.segredos.de(provedor))) {
      this.inbox.registrar(provedor, corpoCru, headers, chave, 'ASSINATURA_INVALIDA');
      this.logger.warn(
        `Webhook ${provedor} com assinatura inválida — origem ${headers['x-forwarded-for'] ?? 'desconhecida'}`,
      );
      throw new UnauthorizedException('Assinatura inválida');
    }

    const { evento, duplicado } = this.inbox.registrar(
      provedor,
      corpoCru,
      headers,
      chave,
      'RECEBIDO',
    );

    // §62: o mesmo evento chegando duas vezes nao pode baixar a conta duas
    // vezes. Responde 200 — reentrega e comportamento normal de provedor, e um
    // erro faria o banco insistir sem necessidade.
    if (duplicado) {
      this.logger.log(`Webhook ${provedor} repetido, ignorado: ${chave}`);
      return { recebido: true, eventoId: evento.id, duplicado: true };
    }

    await this.fila.enfileirar({ eventoId: evento.id });
    return { recebido: true, eventoId: evento.id, duplicado: false };
  }
}
