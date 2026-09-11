import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { BankAccountConfig } from '@synapse/types';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  installmentSchema,
  manualSettlementSchema,
  bankAccountSchema,
  type InstallmentInput,
} from '../dto/boleto.schemas';
import { BoletoService } from '../services/boleto.service';
import { BoletoRepository } from '../repositories/boleto.repository';

const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
@Controller('finance/boletos')
export class BoletoController {
  constructor(private readonly service: BoletoService) {}
  @Get()
  @RequirePermission('financeiro.visualizar')
  list(
    @CurrentTenant() context: TenantContext,
    @Query('branchId', new ZodValidationPipe(idSchema)) branchId: string,
  ) {
    return this.service.list(context, branchId);
  }
  @Post()
  @RequirePermission('financeiro.editar')
  issue(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(installmentSchema)) input: InstallmentInput,
  ) {
    return this.service.issue(context, input);
  }
  @Get(':id/second-copy')
  @RequirePermission('financeiro.visualizar')
  secondCopy(
    @CurrentTenant() context: TenantContext,
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
  ) {
    return this.service.secondCopy(context, id);
  }
  @Post(':id/cancel')
  @RequirePermission('financeiro.editar')
  cancel(
    @CurrentTenant() context: TenantContext,
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
  ) {
    return this.service.cancel(context, id);
  }
  @Post(':id/settle')
  @RequirePermission('financeiro.editar')
  settle(
    @CurrentTenant() context: TenantContext,
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(manualSettlementSchema))
    input: z.infer<typeof manualSettlementSchema>,
  ) {
    return this.service.settleManual(context, id, input);
  }
}

@Controller('finance/bank-accounts')
export class BankAccountController {
  constructor(private readonly repository: BoletoRepository) {}
  @Get()
  @RequirePermission('financeiro.editar')
  list(@CurrentTenant() context: TenantContext) {
    return this.repository.accounts(context.tenantId);
  }
  @Put()
  @RequirePermission('financeiro.editar')
  save(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(bankAccountSchema)) input: BankAccountConfig,
  ) {
    return this.repository.saveAccount(context.tenantId, input, context.userId);
  }
}
