import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../../iam/iam.decorators';
import { AuditedMutation } from '../../audit/audit.decorator';
import {
  fiscalEventSchema,
  retryNfceSchema,
  type FiscalEventInput,
  type RetryNfceInput,
} from '../dto/fiscal.schemas';
import { NfceService } from '../services/nfce.service';

@Controller('fiscal/nfce')
@AuditedMutation({ domain: 'FISCAL', entity: 'FiscalDocument', collection: 'fiscalDocuments' })
export class NfceController {
  constructor(private readonly service: NfceService) {}

  @Get(':id/status')
  @RequirePermission('fiscal.visualizar')
  status(@Param('id') id: string) {
    return this.service.consult(id);
  }

  @Post(':id/retry-contingency')
  @RequirePermission('fiscal.emitir')
  retry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(retryNfceSchema)) input: RetryNfceInput,
  ) {
    return this.service.retryContingency(id, input);
  }

  @Post(':id/cancel')
  @RequirePermission('fiscal.cancelar')
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(fiscalEventSchema)) input: FiscalEventInput,
  ) {
    return this.service.cancel(id, input);
  }

  @Get(':id/xml')
  @RequirePermission('fiscal.visualizar')
  async xml(@Param('id') id: string, @Res() response: Response) {
    response.type('application/xml').send(await this.service.xml(id));
  }

  @Get(':id/danfe')
  @RequirePermission('fiscal.visualizar')
  async danfe(@Param('id') id: string, @Res() response: Response) {
    const print = await this.service.print(id);
    if (print.qrCodeUrl) response.setHeader('x-nfce-qrcode-url', print.qrCodeUrl);
    response.type('application/pdf').send(Buffer.from(print.danfe));
  }
}
