import { Body, Controller, Get, Param, Put, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { fiscalConfigSchema, type FiscalConfigInput } from '../dto/fiscal.schemas';
import { FiscalConfigService } from '../services/fiscal-config.service';

@Controller('fiscal/config')
export class FiscalConfigController {
  constructor(private readonly service: FiscalConfigService) {}
  @Get(':companyId') get(@Param('companyId') companyId: string) {
    return this.service.get(companyId);
  }
  @Put() @UsePipes(new ZodValidationPipe(fiscalConfigSchema)) save(
    @Body() input: FiscalConfigInput,
  ) {
    return this.service.save(input);
  }
}
