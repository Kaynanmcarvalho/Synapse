import { Body, Controller, Param, Post } from '@nestjs/common';
import type { StockMovementKind } from '@synapse/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { stockCommandSchema, type StockCommand } from '../dto/inventory.schemas';
import { InventoryService } from '../services/inventory.service';
import { RequireFeature } from '../../saas/feature.decorator';

@Controller('inventory')
@RequireFeature('INVENTORY')
@RequirePermission('estoque.ajustar')
@AuditedMutation({ domain: 'INVENTORY', entity: 'Inventory', collection: 'inventory' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Post('reserve') reserve(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(stockCommandSchema)) input: StockCommand,
  ) {
    return this.service.reserve(context, input);
  }
  @Post('fulfill') fulfill(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(stockCommandSchema)) input: StockCommand,
  ) {
    return this.service.fulfill(context, input);
  }
  @Post('release') release(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(stockCommandSchema)) input: StockCommand,
  ) {
    return this.service.release(context, input);
  }
  @Post('movement/:kind') movement(
    @CurrentTenant() context: TenantContext,
    @Param('kind') kind: StockMovementKind,
    @Body(new ZodValidationPipe(stockCommandSchema)) input: StockCommand,
  ) {
    const inbound: StockMovementKind[] = ['INBOUND', 'RETURN', 'BONUS'];
    return this.service.move(
      context,
      input,
      kind,
      inbound.includes(kind) ? input.quantity : -input.quantity,
    );
  }
}
