import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { globalSearchQuerySchema, type GlobalSearchQuery } from '../dto/search.schemas';
import { SearchService } from '../services/search.service';

/** §59 "busca global": um único campo, seis entidades. Permissão mínima —
 *  qualquer membro autenticado do tenant já pode ver produto e estoque, e a
 *  busca não devolve nada que a permissão de cada entidade não devolveria
 *  numa tela dedicada (mesmos repositórios, mesmo escopo de tenant). */
@Controller('search')
@RequirePermission('estoque.visualizar')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  search(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(globalSearchQuerySchema)) query: GlobalSearchQuery,
  ) {
    return this.service.search(context, query.q, query.limit);
  }
}
