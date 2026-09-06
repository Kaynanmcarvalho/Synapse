import { Controller, Get, Query } from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { AuditRepository } from '../repositories/audit.repository';
import { z } from 'zod';
import { paginationSchema } from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

const auditQuerySchema = paginationSchema.extend({
  userId: z.string().optional(),
  entity: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audits: AuditRepository) {}
  @Get()
  @RequirePermission('auditoria.visualizar')
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(auditQuerySchema)) query: z.infer<typeof auditQuerySchema>,
  ) {
    return this.audits.query(tenant.tenantId, query);
  }
}
