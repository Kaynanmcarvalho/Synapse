import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { SuggestionPurchaseService } from '../services/suggestion-purchase.service';

const inputSchema = z
  .object({
    branchId: z.string().min(1).max(120),
    warehouseId: z.string().min(1).max(120),
    suggestionIds: z.array(z.string().min(1).max(240)).min(1).max(100),
  })
  .strict();

@Controller('purchasing/from-suggestions')
@RequirePermission('compras.gerenciar')
export class SuggestionPurchaseController {
  constructor(private readonly service: SuggestionPurchaseService) {}
  @Post()
  create(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(inputSchema)) input: z.infer<typeof inputSchema>,
  ) {
    return this.service.create(context, input);
  }
}
