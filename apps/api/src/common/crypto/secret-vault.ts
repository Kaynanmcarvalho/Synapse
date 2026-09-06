import { ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Cofre AES-256-GCM, generico quanto a chave-mestra.
 *
 *  O modulo fiscal tem hoje uma copia desta logica presa a FISCAL_MASTER_KEY.
 *  Esta versao recebe o nome da variavel, para cada dominio ter a sua chave sem
 *  duplicar a criptografia de novo. A copia do fiscal deve migrar para ca — e
 *  uma troca de import, feita fora deste cartao para nao mexer no modulo de
 *  outra pessoa no meio do caminho.
 *
 *  O armazenamento e em memoria: o segredo cifrado nao sobrevive a um restart.
 *  Trocar isto por Secret Manager e mexer so em `guardados`. */
export class SecretVault {
  private readonly guardados = new Map<string, string>();

  constructor(private readonly nomeDaVariavel: string) {}

  private chave(): Buffer {
    const codificada = process.env[this.nomeDaVariavel];
    if (!codificada) {
      throw new ServiceUnavailableException(`${this.nomeDaVariavel} não configurada`);
    }
    const chave = Buffer.from(codificada, 'base64');
    if (chave.length !== 32) {
      throw new ServiceUnavailableException(`${this.nomeDaVariavel} deve ter 32 bytes em base64`);
    }
    return chave;
  }

  store(referencia: string, valor: string | Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.chave(), iv);
    const cifrado = Buffer.concat([cipher.update(valor), cipher.final()]);
    this.guardados.set(
      referencia,
      Buffer.concat([iv, cipher.getAuthTag(), cifrado]).toString('base64'),
    );
    return referencia;
  }

  read(referencia: string): Buffer {
    const guardado = this.guardados.get(referencia);
    if (!guardado) throw new ServiceUnavailableException(`Segredo ${referencia} não encontrado`);

    const payload = Buffer.from(guardado, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.chave(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
  }

  has(referencia: string): boolean {
    return this.guardados.has(referencia);
  }

  /** Apaga o segredo. Usado ao trocar credencial: o valor velho nao fica para tras. */
  forget(referencia: string): void {
    this.guardados.delete(referencia);
  }
}
