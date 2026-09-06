import { BadRequestException } from '@nestjs/common';
import type { BankEnvironment, ItauConfig } from '@synapse/types';
import { ProviderBancarioBase } from './contrato-pendente';

export interface CredenciaisItau {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly certificado: Buffer;
}

const OBRIGATORIOS: readonly (keyof ItauConfig)[] = [
  'agencia',
  'conta',
  'carteira',
  'chavePix',
  'clientIdSecretRef',
  'clientSecretSecretRef',
  'certificadoSecretRef',
];

/** Itau (§21), no mesmo padrao do Sicredi.
 *
 *  Muda a identificacao da conta — agencia em vez de cooperativa e posto — e
 *  nada mais: e essa a razao de existir a interface. */
export class ItauProvider extends ProviderBancarioBase {
  constructor(
    private readonly config: ItauConfig,
    private readonly credenciais: CredenciaisItau,
    environment: BankEnvironment,
    baseUrl: string,
  ) {
    super('ITAU', environment, baseUrl);
    ItauProvider.validar(config);
  }

  static validar(config: ItauConfig): void {
    const faltando = OBRIGATORIOS.filter((campo) => !config[campo]);
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Configuração Itaú incompleta. Faltando: ${faltando.join(', ')}`,
      );
    }
    if (!/^\d{4}$/.test(config.agencia)) {
      throw new BadRequestException('Agência Itaú deve ter 4 dígitos');
    }
  }

  get beneficiario(): string {
    return `${this.config.agencia}/${this.config.conta}`;
  }

  get carteira(): string {
    return this.config.carteira;
  }

  get chavePix(): string {
    return this.config.chavePix;
  }

  get credenciaisCompletas(): boolean {
    return Boolean(
      this.credenciais.clientId &&
      this.credenciais.clientSecret &&
      this.credenciais.certificado.length > 0,
    );
  }
}
