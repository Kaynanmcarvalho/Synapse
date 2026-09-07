import { BadRequestException, Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { z } from 'zod';
import { FIREBASE_FIRESTORE } from '../iam/firebase.tokens';
import { BoletoRepository } from '../finance/repositories/boleto.repository';
import { BankProviderRegistry } from '../finance/services/bank-provider.registry';
import { WebhookInbox } from './webhook-inbox';
import { FilaDeWebhooks } from './webhook-queue';

// Envelope do adaptador MOCK. Os adapters bancários reais ainda recusam
// operações enquanto os contratos de cada banco não forem configurados.
const envelope = z.object({ referencia: z.string().regex(/^[a-f0-9]{64}$/) }).passthrough();

@Injectable()
export class BoletoWebhookProcessor implements OnModuleInit {
  constructor(
    @Inject(FIREBASE_FIRESTORE) private readonly db: Firestore,
    private readonly inbox: WebhookInbox,
    private readonly queue: FilaDeWebhooks,
    private readonly charges: BoletoRepository,
    private readonly providers: BankProviderRegistry,
  ) {}
  onModuleInit() {
    this.queue.registrarProcessador(async ({ eventoId }) => {
      const event = this.inbox.buscar(eventoId);
      if (!event || event.situacao === 'ASSINATURA_INVALIDA')
        throw new BadRequestException('Evento não autenticado');
      if (event.provedor === 'fiscal')
        throw new BadRequestException('Processador fiscal ainda não configurado');
      const payload = envelope.parse(JSON.parse(event.corpoCru) as unknown);
      const routing = await this.db.doc(`bankReferences/${payload.referencia}`).get();
      if (!routing.exists) throw new BadRequestException('Referência bancária desconhecida');
      const { tenantId, accountId } = routing.data() as { tenantId: string; accountId: string };
      const account = await this.charges.account(tenantId, accountId);
      if (account.bankId.toLowerCase() !== event.provedor)
        throw new BadRequestException('Banco não corresponde à cobrança');
      const charge = await this.charges.get(tenantId, payload.referencia);
      if (charge.status === 'PAID') return;
      const normalized = await this.providers
        .resolve(account)
        .handleWebhook({ payload, headers: event.headers, assinatura: null });
      if (normalized.kind === 'BOLETO_LIQUIDADO' && normalized.valorCentavos !== null) {
        await this.charges.settle(
          tenantId,
          charge.id,
          event.chaveDeIdempotencia,
          normalized.valorCentavos,
          'bank-webhook',
          'Baixa automática por webhook autenticado',
        );
      } else if (normalized.kind === 'BOLETO_BAIXADO') {
        await this.charges.cancel(tenantId, charge.id);
      } else throw new BadRequestException('Evento não corresponde a baixa de boleto');
    });
  }
}
