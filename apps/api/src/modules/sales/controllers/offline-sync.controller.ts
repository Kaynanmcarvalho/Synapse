import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { offlineOrderSchema, type OfflineOrderInput } from '../dto/offline-sync.schemas';
import { OfflineSyncService } from '../services/offline-sync.service';

@Controller('sales/offline-sync')
export class OfflineSyncController {
  constructor(private readonly service: OfflineSyncService) {}
  @Post('orders') @RequirePermission('venda.criar') sync(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(offlineOrderSchema)) input: OfflineOrderInput,
  ) {
    return this.service.sync(tenant, input);
  }
}
