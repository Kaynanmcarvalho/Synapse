import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import { AuditedMutation } from '../../audit/audit.decorator';
import type { TenantContext } from '../../iam/iam.types';
import {
  cashMovementSchema,
  closeCashSessionSchema,
  completePosSaleSchema,
  openCashSessionSchema,
  type CashMovementInput,
  type CompletePosSaleInput,
} from '../dto/pos.schemas';
import { PosService } from '../services/pos.service';

@Controller('sales/pos')
@RequirePermission('venda.criar')
@AuditedMutation({ domain: 'FINANCE', entity: 'CashSession', collection: 'cashSessions' })
export class PosController {
  constructor(private readonly service: PosService) {}
  @Get('cash-sessions/current') current(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId: string,
  ) {
    return this.service.getCurrentSession(tenant, branchId);
  }
  @Post('cash-sessions') open(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(openCashSessionSchema))
    input: { branchId: string; openingAmount: number },
  ) {
    return this.service.openCash(tenant, input.branchId, input.openingAmount);
  }
  @Post('cash-sessions/:id/supply') supply(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cashMovementSchema)) input: CashMovementInput,
  ) {
    return this.service.addMovement(id, 'SUPPLY', input, tenant.userId);
  }
  @Post('cash-sessions/:id/withdrawal') withdrawal(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cashMovementSchema)) input: CashMovementInput,
  ) {
    return this.service.addMovement(id, 'WITHDRAWAL', input, tenant.userId);
  }
  @Post('cash-sessions/:id/sales') sale(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(completePosSaleSchema)) input: CompletePosSaleInput,
  ) {
    return this.service.completeSale(id, input, { issueNfce: async () => randomUUID() }, tenant);
  }
  @Post('cash-sessions/:id/close') close(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(closeCashSessionSchema)) input: { countedCash: number },
  ) {
    return this.service.closeCash(id, input.countedCash);
  }
  @Get('sales/:id/receipt') receipt(@Param('id') id: string) {
    return this.service.reprintSale(id);
  }
}
