import { Body, Controller, Param, Post } from '@nestjs/common';
import type { PosItem, OrderChannel } from '@synapse/types';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { OrderService } from '../services/order.service';

@Controller('sales/orders')
@RequirePermission('venda.criar')
@AuditedMutation({ domain: 'PRICE', entity: 'SalesOrder', collection: 'salesOrders' })
export class OrderController {
  constructor(private readonly orders: OrderService) {}
  @Post('quotes') quote(
    @CurrentTenant() tenant: TenantContext,
    @Body()
    body: {
      branchId: string;
      customerId: string;
      channel: OrderChannel;
      items: PosItem[];
    },
  ) {
    return this.orders.quote(tenant, body);
  }
  @Post(':id/approve') approve(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.orders.approve(tenant, id);
  }
  @Post(':id/pick') pick(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
  ) {
    return this.orders.pick(tenant, id, body.productIds);
  }
}
