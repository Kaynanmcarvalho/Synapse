import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { fiscalConfigSchema, type FiscalConfigInput } from '../dto/fiscal.schemas';
import { FiscalConfigService } from '../services/fiscal-config.service';

@Controller('fiscal/config')
@AuditedMutation({ domain: 'FISCAL', entity: 'FiscalConfig', collection: 'fiscalConfigs' })
export class FiscalConfigController {
  constructor(private readonly service: FiscalConfigService) {}
  /** Config da empresa do usuario logado. A emissao e a Central de Integracoes
   *  usam o tenant como companyId; a resposta devolve qual foi usado para o PUT.
   *  Sempre um objeto: config ainda nao salva vem como `null`, nao corpo vazio. */
  @Get()
  @RequirePermission('fiscal.configurar')
  current(@CurrentTenant() tenant: TenantContext) {
    return this.currentConfig(tenant.tenantId);
  }
  @Get(':companyId')
  @RequirePermission('fiscal.configurar')
  get(@CurrentTenant() tenant: TenantContext, @Param('companyId') companyId: string) {
    return this.service.get(this.allowedCompanyId(tenant, companyId));
  }
  @Put()
  @RequirePermission('fiscal.configurar')
  save(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(fiscalConfigSchema)) input: FiscalConfigInput,
  ) {
    return this.service.save(tenant.tenantId, input);
  }

  private async currentConfig(companyId: string) {
    return { companyId, config: (await this.service.get(companyId)) ?? null };
  }

  private allowedCompanyId(tenant: TenantContext, requested: string): string {
    return tenant.roleIds.includes('SUPER_ADMIN_SAAS') ? requested : tenant.tenantId;
  }
}
