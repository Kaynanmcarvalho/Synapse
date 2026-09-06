import { Body, Controller, Param, Post, UsePipes } from '@nestjs/common';
import type { StockMovementKind } from '@synapse/types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { stockCommandSchema, type StockCommand } from '../dto/inventory.schemas';
import { InventoryService } from '../services/inventory.service';

@Controller('inventory')
@AuditedMutation({ domain: 'INVENTORY', entity: 'Inventory', collection: 'inventory' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Post('reserve') @UsePipes(new ZodValidationPipe(stockCommandSchema)) reserve(
    @CurrentTenant() context: TenantContext,
    @Body() input: StockCommand,
  ) {
    return this.service.reserve(context, input);
  }
  @Post('fulfill') @UsePipes(new ZodValidationPipe(stockCommandSchema)) fulfill(
    @CurrentTenant() context: TenantContext,
    @Body() input: StockCommand,
  ) {
    return this.service.fulfill(context, input);
  }
  @Post('release') @UsePipes(new ZodValidationPipe(stockCommandSchema)) release(
    @CurrentTenant() context: TenantContext,
    @Body() input: StockCommand,
  ) {
    return this.service.release(context, input);
  }
  @Post('movement/:kind') @UsePipes(new ZodValidationPipe(stockCommandSchema)) movement(
    @CurrentTenant() context: TenantContext,
    @Param('kind') kind: StockMovementKind,
    @Body() input: StockCommand,
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
