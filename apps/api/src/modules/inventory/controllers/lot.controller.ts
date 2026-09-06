import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createLotSchema,
  reserveFefoSchema,
  type CreateLotInput,
  type ReserveFefoInput,
} from '@synapse/validation';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { LotService } from '../services/lot.service';
import { RequireFeature } from '../../saas/feature.decorator';
import { paginationDtoSchema, type PaginationDto } from '../../../common/dto/pagination.dto';

const balanceQuerySchema = z.object({
  branchId: z.string().min(1),
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
});

const quantitySchema = z.object({ quantity: z.number().positive() });

@Controller('inventory/lots')
@RequireFeature('INVENTORY')
@RequirePermission('estoque.ajustar')
@AuditedMutation({ domain: 'INVENTORY', entity: 'Lot', collection: 'lots' })
export class LotController {
  constructor(private readonly lots: LotService) {}

  @Post()
  register(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createLotSchema)) input: CreateLotInput,
  ) {
    return this.lots.registerLot(tenant, input);
  }

  @Get('balance')
  balance(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(balanceQuerySchema)) query: z.infer<typeof balanceQuerySchema>,
  ) {
    return this.lots.balance(tenant, query.branchId, query.warehouseId, query.productId);
  }

  @Get('expiry-alerts')
  expiryAlerts(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(paginationDtoSchema)) page: PaginationDto,
  ) {
    return this.lots.expiryAlerts(tenant, page.limit, page.cursor);
  }

  @Post('reserve-fefo')
  reserveFefo(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(reserveFefoSchema)) input: ReserveFefoInput,
  ) {
    return this.lots.reserveFefo(
      tenant,
      input.branchId,
      input.warehouseId,
      input.productId,
      input.quantity,
    );
  }

  @Post(':id/consume')
  consume(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(quantitySchema)) body: { quantity: number },
  ) {
    return this.lots.consume(tenant, id, body.quantity);
  }

  @Post(':id/release')
  release(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(quantitySchema)) body: { quantity: number },
  ) {
    return this.lots.releaseReservation(tenant, id, body.quantity);
  }
}
