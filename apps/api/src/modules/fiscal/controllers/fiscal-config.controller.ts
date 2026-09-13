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
    return { companyId: tenant.tenantId, config: this.service.get(tenant.tenantId) ?? null };
  }
  @Get(':companyId')
  @RequirePermission('fiscal.configurar')
  get(@Param('companyId') companyId: string) {
    return this.service.get(companyId);
  }
  @Put()
  @RequirePermission('fiscal.configurar')
  save(@Body(new ZodValidationPipe(fiscalConfigSchema)) input: FiscalConfigInput) {
    return this.service.save(input);
  }
}
