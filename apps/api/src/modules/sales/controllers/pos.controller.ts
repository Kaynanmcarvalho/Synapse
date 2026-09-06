import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant } from '../../iam/iam.decorators';
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
@AuditedMutation({ domain: 'FINANCE', entity: 'CashSession', collection: 'cashSessions' })
export class PosController {
  constructor(private readonly service: PosService) {}
  @Post('cash-sessions') @UsePipes(new ZodValidationPipe(openCashSessionSchema)) open(
    @CurrentTenant() tenant: TenantContext,
    @Body() input: { branchId: string; openingAmount: number },
  ) {
    return this.service.openCash(tenant, input.branchId, input.openingAmount);
  }
  @Post('cash-sessions/:id/supply') @UsePipes(new ZodValidationPipe(cashMovementSchema)) supply(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() input: CashMovementInput,
  ) {
    return this.service.addMovement(id, 'SUPPLY', input, tenant.userId);
  }
  @Post('cash-sessions/:id/withdrawal')
  @UsePipes(new ZodValidationPipe(cashMovementSchema))
  withdrawal(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() input: CashMovementInput,
  ) {
    return this.service.addMovement(id, 'WITHDRAWAL', input, tenant.userId);
  }
  @Post('cash-sessions/:id/sales') @UsePipes(new ZodValidationPipe(completePosSaleSchema)) sale(
    @Param('id') id: string,
    @Body() input: CompletePosSaleInput,
  ) {
    return this.service.completeSale(id, input, { issueNfce: async () => randomUUID() });
  }
  @Post('cash-sessions/:id/close') @UsePipes(new ZodValidationPipe(closeCashSessionSchema)) close(
    @Param('id') id: string,
    @Body() input: { countedCash: number },
  ) {
    return this.service.closeCash(id, input.countedCash);
  }
  @Get('sales/:id/receipt') receipt(@Param('id') id: string) {
    return this.service.reprintSale(id);
  }
}
