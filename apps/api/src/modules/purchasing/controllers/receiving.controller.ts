import { Body, Controller, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  receiveManualSchema,
  receiveXmlSchema,
  type ReceiveManualInput,
  type ReceiveXmlInput,
} from '../dto/purchasing.schemas';
import { ReceivingService } from '../services/receiving.service';

@Controller('purchasing/orders/:orderId/receivings')
@RequirePermission('compras.receber')
@AuditedMutation({ domain: 'INVENTORY', entity: 'Receiving', collection: 'receivings' })
export class ReceivingController {
  constructor(private readonly service: ReceivingService) {}

  @Post('manual')
  receiveManual(
    @CurrentTenant() context: TenantContext,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(receiveManualSchema)) input: ReceiveManualInput,
  ) {
    return this.service.receiveManual(context, orderId, input);
  }

  @Post('xml')
  receiveFromXml(
    @CurrentTenant() context: TenantContext,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(receiveXmlSchema)) input: ReceiveXmlInput,
  ) {
    return this.service.receiveFromXml(context, orderId, input);
  }
}
