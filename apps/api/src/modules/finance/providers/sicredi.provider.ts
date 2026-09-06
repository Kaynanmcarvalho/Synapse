import { BadRequestException } from '@nestjs/common';
import type { BankEnvironment, SicrediConfig } from '@synapse/types';
import { ProviderBancarioBase } from './contrato-pendente';

/** Credenciais ja abertas do cofre. Existem so dentro do backend (§62). */
export interface CredenciaisSicredi {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly certificado: Buffer;
}

const OBRIGATORIOS: readonly (keyof SicrediConfig)[] = [
  'cooperativa',
  'posto',
  'conta',
  'carteira',
  'chavePix',
  'clientIdSecretRef',
  'clientSecretSecretRef',
  'certificadoSecretRef',
];

/** Sicredi (§20).
 *
 *  O que ja vale: a configuracao da secao 20 validada, o ambiente escolhido e
 *  as credenciais abertas do cofre. O que falta: as chamadas HTTP, que so
 *  entram com a documentacao oficial na mao — ver docs/BANKING.md. */
export class SicrediProvider extends ProviderBancarioBase {
  constructor(
    private readonly config: SicrediConfig,
    private readonly credenciais: CredenciaisSicredi,
    environment: BankEnvironment,
    baseUrl: string,
  ) {
    super('SICREDI', environment, baseUrl);
    SicrediProvider.validar(config);
  }

  static validar(config: SicrediConfig): void {
    const faltando = OBRIGATORIOS.filter((campo) => !config[campo]);
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Configuração Sicredi incompleta. Faltando: ${faltando.join(', ')}`,
      );
    }
    if (!/^\d{1,5}$/.test(config.cooperativa)) {
      throw new BadRequestException('Cooperativa Sicredi deve ser numérica');
    }
    if (!/^\d{1,2}$/.test(config.posto)) {
      throw new BadRequestException('Posto Sicredi deve ter 1 ou 2 dígitos');
    }
  }

  /** Identificacao da conta no beneficiario, como a secao 20 descreve. */
  get beneficiario(): string {
    return `${this.config.cooperativa}/${this.config.posto}/${this.config.conta}`;
  }

  get carteira(): string {
    return this.config.carteira;
  }

  get chavePix(): string {
    return this.config.chavePix;
  }

  /** Prova que o cofre entregou as tres credenciais antes de qualquer chamada. */
  get credenciaisCompletas(): boolean {
    return Boolean(
      this.credenciais.clientId &&
      this.credenciais.clientSecret &&
      this.credenciais.certificado.length > 0,
    );
  }
}
