import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  adjustSuggestionSchema,
  listStockIntelligenceQuerySchema,
  recalculateStockIntelligenceSchema,
  type AdjustSuggestionInput,
  type ListStockIntelligenceQuery,
  type RecalculateStockIntelligenceInput,
} from '../dto/stock-intelligence.schemas';
import { StockIntelligenceService } from '../services/stock-intelligence.service';

@Controller('analytics/stock-intelligence')
@RequirePermission('estoque.inteligencia.visualizar')
export class StockIntelligenceController {
  constructor(private readonly service: StockIntelligenceService) {}

  @Get()
  list(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(listStockIntelligenceQuerySchema))
    query: ListStockIntelligenceQuery,
  ) {
    return this.service.list(context.tenantId, query);
  }

  @Post('recalculate')
  @RequirePermission('estoque.inteligencia.ajustar')
  recalculate(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(recalculateStockIntelligenceSchema))
    body: RecalculateStockIntelligenceInput,
  ) {
    return this.service.recalculate(context.tenantId, body.branchId);
  }

  @Patch(':productId/suggestion')
  @RequirePermission('estoque.inteligencia.ajustar')
  adjust(
    @CurrentTenant() context: TenantContext,
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(adjustSuggestionSchema)) input: AdjustSuggestionInput,
  ) {
    return this.service.adjust(context.tenantId, productId, context.userId, input);
  }
}
