import { Body, Controller, Get, Param, Post, Res, UsePipes } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant } from '../../iam/iam.decorators';
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

@Controller('fiscal/nfe')
@AuditedMutation({ domain: 'FISCAL', entity: 'FiscalDocument', collection: 'fiscalDocuments' })
export class NfeController {
  constructor(private readonly service: NfeService) {}
  @Post() @UsePipes(new ZodValidationPipe(issueNfeSchema)) issue(
    @CurrentTenant() tenant: TenantContext,
    @Body() input: IssueNfeInput,
  ) {
    return this.service.issue(tenant.tenantId, input);
  }
  @Get(':id/status') consult(@Param('id') id: string) {
    return this.service.consult(id);
  }
  @Post(':id/cancel') @UsePipes(new ZodValidationPipe(fiscalEventSchema)) cancel(
    @Param('id') id: string,
    @Body() input: FiscalEventInput,
  ) {
    return this.service.cancel(id, input);
  }
  @Post(':id/correction') @UsePipes(new ZodValidationPipe(fiscalEventSchema)) correct(
    @Param('id') id: string,
    @Body() input: FiscalEventInput,
  ) {
    return this.service.correct(id, input);
  }
  @Post('invalidation') @UsePipes(new ZodValidationPipe(invalidateNfeSchema)) invalidate(
    @Body() input: InvalidateNfeInput,
  ) {
    return this.service.invalidate(input);
  }
  @Get(':id/xml') async xml(@Param('id') id: string, @Res() response: Response) {
    response.type('application/xml').send(await this.service.xml(id));
  }
  @Get(':id/danfe') async danfe(@Param('id') id: string, @Res() response: Response) {
    response.type('application/pdf').send(Buffer.from(await this.service.danfe(id)));
  }
}
