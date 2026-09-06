import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../iam/iam.decorators';
import type { TenantContext } from '../iam/iam.types';
import { MaterializedAggregateService } from './materialized-aggregate.service';

@Controller('performance')
@RequirePermission('auditoria.visualizar')
export class PerformanceController {
  constructor(private readonly aggregates: MaterializedAggregateService) {}
  @Get('aggregates/:metric') read(
    @CurrentTenant() tenant: TenantContext,
    @Param('metric') metric: string,
  ) {
    return this.aggregates.read(tenant.tenantId, metric);
  }
  @Post('aggregates/:metric/refresh') refresh(
    @CurrentTenant() tenant: TenantContext,
    @Param('metric') metric: string,
  ) {
    return this.aggregates.refresh(tenant.tenantId, metric);
  }
}
