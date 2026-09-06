import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  createSavedFilterSchema,
  listSavedFiltersQuerySchema,
  type CreateSavedFilterInput,
  type ListSavedFiltersQuery,
} from '../dto/search.schemas';
import { SavedFilterService } from '../services/saved-filter.service';

/** §60 "filtros salvos por usuário". Sem permissão dedicada: é uma
 *  preferência pessoal sobre uma tela que o usuário já pode ver, não um
 *  dado de negócio novo — @SkipPermission caberia, mas exige login normal
 *  (tenant resolvido), então usa a mesma permissão mínima da busca. */
@Controller('search/saved-filters')
@RequirePermission('estoque.visualizar')
export class SavedFilterController {
  constructor(private readonly service: SavedFilterService) {}

  @Get()
  list(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(listSavedFiltersQuerySchema)) query: ListSavedFiltersQuery,
  ) {
    return this.service.list(context, query.screen);
  }

  @Post()
  create(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(createSavedFilterSchema)) input: CreateSavedFilterInput,
  ) {
    return this.service.create(context, input);
  }

  @Delete(':id')
  async remove(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    await this.service.delete(context, id);
    // Corpo explícito: um 200 sem corpo faz `response.json()` no cliente
    // estourar (JSON vazio não é JSON válido) — mais simples devolver algo
    // serializável do que cada chamador tratar resposta vazia como caso especial.
    return { deleted: true };
  }
}
