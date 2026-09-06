import { Body, Controller, Param, Post } from '@nestjs/common';
import type { StockTransfer } from '@synapse/types';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { TransferService } from '../services/transfer.service';

@Controller('inventory/transfers')
@RequirePermission('estoque.transferir')
@AuditedMutation({ domain: 'INVENTORY', entity: 'StockTransfer', collection: 'transfers' })
export class TransferController {
  constructor(private readonly transfers: TransferService) {}
  @Post() create(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: Omit<StockTransfer, 'id' | 'tenantId' | 'status' | 'history'>,
  ) {
    return this.transfers.create(tenant, body);
  }
  @Post(':id/approve') approve(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.transfers.approve(tenant, id);
  }
  @Post(':id/picking') picking(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.transfers.startPicking(tenant, id);
  }
  @Post(':id/ship') ship(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { quantities: number[] },
  ) {
    return this.transfers.ship(tenant, id, body.quantities);
  }
  @Post(':id/receive') receive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { quantities: number[] },
  ) {
    return this.transfers.receive(tenant, id, body.quantities);
  }
}
