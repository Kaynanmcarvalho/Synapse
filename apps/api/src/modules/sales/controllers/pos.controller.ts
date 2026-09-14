import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import { AuditedMutation } from '../../audit/audit.decorator';
import type { TenantContext } from '../../iam/iam.types';
import {
  cancelarVendaSchema,
  cashMovementSchema,
  closeCashSessionSchema,
  completePosSaleSchema,
  openCashSessionSchema,
  type CancelarVendaInput,
  type CashMovementInput,
  type CompletePosSaleInput,
} from '../dto/pos.schemas';
import { PosService } from '../services/pos.service';
import { VendaDoPdvService } from '../services/venda-do-pdv.service';
import { NfceService } from '../../fiscal/services/nfce.service';

/** PDV: caixa (abrir, suprimento, sangria, fechar) e vendas nos modos NFC-e e
 *  balcão. Tudo em Firestore — ver CashSessionRepository. */
@Controller('sales/pos')
@RequirePermission('venda.criar')
@AuditedMutation({ domain: 'FINANCE', entity: 'CashSession', collection: 'caixas' })
export class PosController {
  constructor(
    private readonly caixas: PosService,
    private readonly vendas: VendaDoPdvService,
    private readonly nfce: NfceService,
  ) {}

  @Get('cash-sessions/current') current(
    @CurrentTenant() tenant: TenantContext,
    @Query('branchId') branchId: string,
  ) {
    return this.caixas.getCurrentSession(tenant, branchId);
  }

  @Post('cash-sessions') open(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(openCashSessionSchema))
    input: { branchId: string; openingAmount: number; warehouseId: string },
  ) {
    return this.caixas.openCash(tenant, input.branchId, input.openingAmount, input.warehouseId);
  }

  @Post('cash-sessions/:id/supply') supply(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cashMovementSchema)) input: CashMovementInput,
  ) {
    return this.caixas.addMovement(tenant, id, 'SUPPLY', input);
  }

  @Post('cash-sessions/:id/withdrawal') withdrawal(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cashMovementSchema)) input: CashMovementInput,
  ) {
    return this.caixas.addMovement(tenant, id, 'WITHDRAWAL', input);
  }

  @Post('cash-sessions/:id/sales') sale(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(completePosSaleSchema)) input: CompletePosSaleInput,
  ) {
    return this.vendas.concluir(tenant, id, input, this.nfce);
  }

  /** Histórico de Vendas do caixa. */
  @Get('cash-sessions/:id/sales') sales(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.vendas.historico(tenant, id);
  }

  @Post('cash-sessions/:id/close') close(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(closeCashSessionSchema)) input: { countedCash: number },
  ) {
    return this.caixas.closeCash(tenant, id, input.countedCash);
  }

  @Get('sales/:id') receipt(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.vendas.buscar(tenant, id);
  }

  /** O pedido de venda (sem valor fiscal) da venda do balcão, pronto para imprimir. */
  @Get('sales/:id/impressao') impressao(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.vendas.impressao(tenant, id);
  }

  @Post('sales/:id/cancel')
  @RequirePermission('venda.cancelar')
  cancelar(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelarVendaSchema)) input: CancelarVendaInput,
  ) {
    return this.vendas.cancelar(tenant, id, input.motivo, this.nfce);
  }
}
