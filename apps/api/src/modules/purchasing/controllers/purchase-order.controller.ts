import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  addQuoteSchema,
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  selectSupplierSchema,
  type AddQuoteInput,
  type CreatePurchaseOrderInput,
  type ListPurchaseOrdersQuery,
  type SelectSupplierInput,
} from '../dto/purchasing.schemas';
import { PurchaseOrderService } from '../services/purchase-order.service';

@Controller('purchasing/orders')
@RequirePermission('compras.gerenciar')
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}

  @Get()
  list(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(listPurchaseOrdersQuerySchema)) query: ListPurchaseOrdersQuery,
  ) {
    return this.service.list(context, query.branchId, query.status);
  }

  @Get(':id')
  get(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.get(context, id);
  }

  @Get('suppliers/:supplierId/price-history')
  priceHistory(@CurrentTenant() context: TenantContext, @Param('supplierId') supplierId: string) {
    return this.service.priceHistory(context, supplierId);
  }

  @Post()
  create(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(createPurchaseOrderSchema)) input: CreatePurchaseOrderInput,
  ) {
    return this.service.create(context, input);
  }

  @Post(':id/quotes')
  addQuote(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addQuoteSchema)) input: AddQuoteInput,
  ) {
    return this.service.addQuote(context, id, input);
  }

  @Patch(':id/select-supplier')
  selectSupplier(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(selectSupplierSchema)) input: SelectSupplierInput,
  ) {
    return this.service.selectSupplier(context, id, input);
  }
}
