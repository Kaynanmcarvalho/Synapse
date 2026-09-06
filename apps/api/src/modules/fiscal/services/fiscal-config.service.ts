import { BadRequestException, Injectable } from '@nestjs/common';
import type { FiscalCompanyConfig } from '@synapse/types';
import type { FiscalConfigInput } from '../dto/fiscal.schemas';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { SecretVaultService } from './secret-vault.service';

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
    const certificateSecretRef = this.storeWhenPresent(
      `fiscal/${input.companyId}/a1`,
      input.certificateBase64 ? Buffer.from(input.certificateBase64, 'base64') : null,
      previous?.certificateSecretRef,
    );
    const certificatePasswordSecretRef = this.storeWhenPresent(
      `fiscal/${input.companyId}/a1-password`,
      input.certificatePassword,
      previous?.certificatePasswordSecretRef,
    );
    const cscSecretRef = this.storeWhenPresent(
      `fiscal/${input.companyId}/csc`,
      input.csc,
      previous?.cscSecretRef,
    );
    const providerApiKeySecretRef = this.storeWhenPresent(
      `fiscal/${input.companyId}/provider-api-key`,
      input.providerApiKey,
      previous?.providerApiKeySecretRef,
    );
    const providerTenantIdSecretRef = this.storeWhenPresent(
      `fiscal/${input.companyId}/provider-tenant-id`,
      input.providerTenantId,
      previous?.providerTenantIdSecretRef,
    );
    return this.repository.saveConfig({
      companyId: input.companyId,
      environment: input.environment,
      provider: input.provider,
      crt: input.crt,
      stateRegistration: input.stateRegistration,
      cscId: input.cscId ?? null,
      cscSecretRef,
      nfeSeries: input.nfeSeries,
      nfceSeries: input.nfceSeries,
      state: input.state.toUpperCase(),
      taxRegime: input.taxRegime,
      certificateSecretRef,
      certificatePasswordSecretRef,
      providerApiKeySecretRef,
      providerTenantIdSecretRef,
    });
  }
  get(companyId: string) {
    return this.repository.findConfig(companyId);
  }

  private storeWhenPresent(
    reference: string,
    value: string | Buffer | null | undefined,
    previous: string | null | undefined,
  ): string | null {
    return value ? this.vault.store(reference, value) : (previous ?? null);
  }
}
