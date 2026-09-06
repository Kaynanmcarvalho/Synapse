import { Controller, Get, Query } from '@nestjs/common';
import { CurrentTenant } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { AuditRepository } from '../repositories/audit.repository';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audits: AuditRepository) {}
  @Get() list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: { userId?: string; entity?: string; from?: string; to?: string },
  ) {
    return this.audits.query(tenant.tenantId, query);
  }
}
