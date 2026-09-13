import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

interface EncryptedSecret {
  readonly algorithm: 'aes-256-gcm';
  readonly ciphertext: string;
  readonly updatedAt: string;
}

@Injectable()
export class SecretVaultService {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly firestore: Firestore) {}

  private key(): Buffer {
    const encoded = process.env.FISCAL_MASTER_KEY;
    if (!encoded) throw new ServiceUnavailableException('FISCAL_MASTER_KEY não configurada');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32)
      throw new ServiceUnavailableException('FISCAL_MASTER_KEY deve ter 32 bytes em base64');
    return key;
  }
  async store(reference: string, plaintext: string | Buffer): Promise<string> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(reference));
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    await this.firestore.doc(this.path(reference)).set({
      algorithm: 'aes-256-gcm',
      ciphertext: Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64'),
      updatedAt: new Date().toISOString(),
    } satisfies EncryptedSecret);
    return reference;
  }
  async read(reference: string): Promise<Buffer> {
    const snapshot = await this.firestore.doc(this.path(reference)).get();
    const stored = snapshot.exists ? (snapshot.data() as Partial<EncryptedSecret>) : null;
    const payload = Buffer.from(stored?.ciphertext ?? '', 'base64');
    if (payload.length < 29) throw new ServiceUnavailableException('Segredo fiscal não encontrado');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    decipher.setAAD(Buffer.from(reference));
    return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
  }

  /** Coleção fora de /tenants: o cliente jamais pode ler nem mesmo o texto cifrado. */
  private path(reference: string): string {
    if (!/^fiscal\/[^/]+\/[^/]+$/.test(reference)) {
      throw new ServiceUnavailableException('Referência de segredo fiscal inválida');
    }
    return `serverSecrets/fiscal/items/${createHash('sha256').update(reference).digest('hex')}`;
  }
}
