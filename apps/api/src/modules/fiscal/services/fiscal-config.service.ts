import { BadRequestException, Injectable } from '@nestjs/common';
import type { FiscalCompanyConfig } from '@synapse/types';
import type { FiscalConfigInput } from '../dto/fiscal.schemas';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { SecretVaultService } from './secret-vault.service';

/** Bloco nao enviado mantem o salvo; `null` explicito apaga. */
const keep = <T>(value: T | null | undefined, previous: T | null | undefined): T | null =>
  value === undefined ? (previous ?? null) : value;

@Injectable()
export class FiscalConfigService {
  constructor(
    private readonly repository: FiscalRepository,
    private readonly vault: SecretVaultService,
  ) {}
  save(input: FiscalConfigInput): FiscalCompanyConfig {
    if (input.environment === 'PRODUCAO' && input.productionConfirmation !== 'ATIVAR PRODUCAO')
      throw new BadRequestException('Confirme explicitamente ATIVAR PRODUCAO');
    const previous = this.repository.findConfig(input.companyId);
    return this.repository.saveConfig({
      companyId: input.companyId,
      environment: input.environment,
      provider: input.provider,
      crt: input.crt,
      stateRegistration: input.stateRegistration,
      cscId: input.cscId ?? null,
      nfeSeries: input.nfeSeries,
      nfceSeries: input.nfceSeries,
      nfceContingencyEnabled: input.nfceContingencyEnabled,
      nfceCancellationWindowMinutes: input.nfceCancellationWindowMinutes,
      state: input.state.toUpperCase(),
      taxRegime: input.taxRegime,
      issuer: keep(input.issuer, previous?.issuer),
      emission: keep(input.emission, previous?.emission),
      email: keep(input.email, previous?.email),
      pisCofins: keep(input.pisCofins, previous?.pisCofins),
      nfe: keep(input.nfe, previous?.nfe),
      nfce: keep(input.nfce, previous?.nfce),
      ...this.secretRefs(input, previous),
      updatedAt: new Date().toISOString(),
    });
  }
  get(companyId: string) {
    return this.repository.findConfig(companyId);
  }

  /** Segredo so vai para o cofre quando vem preenchido; a config guarda a referencia. */
  private secretRefs(input: FiscalConfigInput, previous: FiscalCompanyConfig | undefined) {
    const base = `fiscal/${input.companyId}`;
    return {
      certificateSecretRef: this.storeWhenPresent(
        `${base}/a1`,
        input.certificateBase64 ? Buffer.from(input.certificateBase64, 'base64') : null,
        previous?.certificateSecretRef,
      ),
      certificatePasswordSecretRef: this.storeWhenPresent(
        `${base}/a1-password`,
        input.certificatePassword,
        previous?.certificatePasswordSecretRef,
      ),
      cscSecretRef: this.storeWhenPresent(`${base}/csc`, input.csc, previous?.cscSecretRef),
      providerApiKeySecretRef: this.storeWhenPresent(
        `${base}/provider-api-key`,
        input.providerApiKey,
        previous?.providerApiKeySecretRef,
      ),
      providerTenantIdSecretRef: this.storeWhenPresent(
        `${base}/provider-tenant-id`,
        input.providerTenantId,
        previous?.providerTenantIdSecretRef,
      ),
      smtpPasswordSecretRef: this.storeWhenPresent(
        `${base}/smtp-password`,
        input.smtpPassword,
        previous?.smtpPasswordSecretRef,
      ),
      nfceOfflinePasswordSecretRef: this.storeWhenPresent(
        `${base}/nfce-offline-password`,
        input.nfceOfflinePassword,
        previous?.nfceOfflinePasswordSecretRef,
      ),
    };
  }

  private storeWhenPresent(
    reference: string,
    value: string | Buffer | null | undefined,
    previous: string | null | undefined,
  ): string | null {
    return value ? this.vault.store(reference, value) : (previous ?? null);
  }
}
