import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, SkipPermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { DashboardService, type DashboardQuery } from '../services/dashboard.service';

const date = z.string().date();
const querySchema = z
  .object({
    from: date,
    to: date,
    branchId: z.string().min(1).optional(),
    sellerId: z.string().min(1).optional(),
    profile: z.enum(['admin', 'stock', 'seller']).default('admin'),
  })
  .refine(
    (q) => q.from <= q.to && Date.parse(q.to) - Date.parse(q.from) <= 366 * 86400000,
    'Período inválido ou maior que um ano',
  );
@Controller('analytics/dashboard')
@SkipPermission()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get()
  get(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(querySchema)) query: DashboardQuery,
  ) {
    // A permissão depende do perfil selecionado e é verificada no serviço.
    return this.service.get(context, query);
  }
}
