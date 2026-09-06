import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { RequirePermission } from '../../iam/iam.decorators';
import { fiscalConfigSchema, type FiscalConfigInput } from '../dto/fiscal.schemas';
import { FiscalConfigService } from '../services/fiscal-config.service';

@Controller('fiscal/config')
@AuditedMutation({ domain: 'FISCAL', entity: 'FiscalConfig', collection: 'fiscalConfigs' })
export class FiscalConfigController {
  constructor(private readonly service: FiscalConfigService) {}
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
