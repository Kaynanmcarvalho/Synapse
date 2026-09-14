import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import { AuditedMutation } from '../../audit/audit.decorator';
import type { TenantContext } from '../../iam/iam.types';
import {
  fiscalEventSchema,
  invalidateNfeSchema,
  issueNfeSchema,
  type FiscalEventInput,
  type InvalidateNfeInput,
  type IssueNfeInput,
} from '../dto/fiscal.schemas';
import { NfeService } from '../services/nfe.service';
import { RequireFeature } from '../../saas/feature.decorator';

@Controller('fiscal/nfe')
@RequireFeature('NFE')
@AuditedMutation({ domain: 'FISCAL', entity: 'FiscalDocument', collection: 'fiscalDocuments' })
export class NfeController {
  constructor(private readonly service: NfeService) {}
  @Post()
  @RequirePermission('fiscal.emitir')
  issue(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(issueNfeSchema)) input: IssueNfeInput,
  ) {
    return this.service.issue(tenant.tenantId, input);
  }
  @Get(':id/status')
  @RequirePermission('fiscal.visualizar')
  consult(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.consult(tenant.tenantId, id);
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
  @Post(':id/correction')
  @RequirePermission('fiscal.emitir')
  correct(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(fiscalEventSchema)) input: FiscalEventInput,
  ) {
    return this.service.correct(tenant.tenantId, id, input);
  }
  @Post('invalidation')
  @RequirePermission('fiscal.cancelar')
  invalidate(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(invalidateNfeSchema)) input: InvalidateNfeInput,
  ) {
    return this.service.invalidate(tenant.tenantId, input);
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
    response
      .type('application/pdf')
      .send(Buffer.from(await this.service.danfe(tenant.tenantId, id)));
  }
}
