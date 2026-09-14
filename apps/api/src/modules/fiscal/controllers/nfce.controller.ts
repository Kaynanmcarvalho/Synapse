import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { AuditedMutation } from '../../audit/audit.decorator';
import {
  fiscalEventSchema,
  retryNfceSchema,
  type FiscalEventInput,
  type RetryNfceInput,
} from '../dto/fiscal.schemas';
import { NfceService } from '../services/nfce.service';
import { RequireFeature } from '../../saas/feature.decorator';

@Controller('fiscal/nfce')
@RequireFeature('NFCE')
@AuditedMutation({ domain: 'FISCAL', entity: 'FiscalDocument', collection: 'fiscalDocuments' })
export class NfceController {
  constructor(private readonly service: NfceService) {}

  @Get(':id/status')
  @RequirePermission('fiscal.visualizar')
  status(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.consult(tenant.tenantId, id);
  }

  @Post(':id/retry-contingency')
  @RequirePermission('fiscal.emitir')
  retry(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(retryNfceSchema)) input: RetryNfceInput,
  ) {
    return this.service.retryContingency(tenant.tenantId, id, input);
  }

  @Post(':id/cancel')
  @RequirePermission('fiscal.cancelar')
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(fiscalEventSchema)) input: FiscalEventInput,
  ) {
    return this.service.cancel(tenant.tenantId, id, input);
  }

  @Get(':id/xml')
  @RequirePermission('fiscal.visualizar')
  async xml(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    response.type('application/xml').send(await this.service.xml(tenant.tenantId, id));
  }

  @Get(':id/danfe')
  @RequirePermission('fiscal.visualizar')
  async danfe(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const print = await this.service.print(tenant.tenantId, id);
    if (print.qrCodeUrl) response.setHeader('x-nfce-qrcode-url', print.qrCodeUrl);
    response.type('application/pdf').send(Buffer.from(print.danfe));
  }
}
