import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Messaging } from '@synapse/firebase/admin';
import { FIREBASE_MESSAGING } from '../iam/firebase.tokens';

@Injectable()
export class FcmGateway {
  constructor(@Inject(FIREBASE_MESSAGING) private readonly messaging: Messaging) {}
  async send(tokens: readonly string[], title: string, body: string, data: Record<string, string>) {
    if (!tokens.length) return { successCount: 0, failureCount: 0 };
    return this.messaging.sendEachForMulticast({
      tokens: [...tokens],
      notification: { title, body },
      data,
    });
  }
}

@Injectable()
export class EmailGateway {
  private readonly logger = new Logger(EmailGateway.name);
  async send(to: string, subject: string, text: string): Promise<void> {
    const url = process.env.EMAIL_API_URL;
    const key = process.env.EMAIL_API_KEY;
    if (!url || !key) {
      this.logger.warn(`E-mail crítico enfileirado sem provider configurado: ${to}`);
      return;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text }),
    });
    if (!response.ok) throw new Error(`Provider de e-mail respondeu ${response.status}`);
  }
}
