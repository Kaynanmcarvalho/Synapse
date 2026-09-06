import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { InventoryCountType, InventoryMovementPolicy } from '@synapse/types';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { InventoryCountService } from '../services/inventory-count.service';

@Controller('inventory/counts')
@RequirePermission('estoque.inventariar')
@AuditedMutation({ domain: 'INVENTORY', entity: 'InventoryCount', collection: 'inventoryCounts' })
export class InventoryCountController {
  constructor(private readonly counts: InventoryCountService) {}

  @Post()
  open(
    @CurrentTenant() context: TenantContext,
    @Body()
    body: {
      branchId: string;
      warehouseId: string;
      type: InventoryCountType;
      movementPolicy: InventoryMovementPolicy;
      categoryId?: string | null;
      items: Array<{
        productId: string;
        barcode: string;
        name: string;
        systemQuantity: number;
        unitCost: number;
      }>;
    },
  ) {
    return this.counts.open(context, body);
  }

  @Get(':id') get(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.counts.get(context, id);
  }

  @Post(':id/scan')
  scan(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @Body() body: { barcode: string; quantity?: number },
  ) {
    return this.counts.scan(context, id, body.barcode, body.quantity);
  }

  @Post(':id/review')
  review(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.counts.review(context, id);
  }

  @Post(':id/adjust')
  adjust(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.counts.adjust(context, id);
  }

  @Get(':id/divergences')
  report(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.counts.divergenceReport(context, id);
  }
}
