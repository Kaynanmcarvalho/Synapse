import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class SecretVaultService {
  private readonly values = new Map<string, string>();
  private key(): Buffer {
    const encoded = process.env.FISCAL_MASTER_KEY;
    if (!encoded) throw new ServiceUnavailableException('FISCAL_MASTER_KEY não configurada');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32)
      throw new ServiceUnavailableException('FISCAL_MASTER_KEY deve ter 32 bytes em base64');
    return key;
  }
  store(reference: string, plaintext: string | Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    this.values.set(
      reference,
      Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64'),
    );
    return reference;
  }
  read(reference: string): Buffer {
    const payload = Buffer.from(this.values.get(reference) ?? '', 'base64');
    if (payload.length < 29) throw new ServiceUnavailableException('Segredo fiscal não encontrado');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
  }
}
