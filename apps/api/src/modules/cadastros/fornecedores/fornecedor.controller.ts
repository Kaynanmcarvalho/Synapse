import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { fornecedorSchema, type FornecedorInput } from '@synapse/validation';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, CurrentUser, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { atorDoToken } from '../ator';
import { FornecedorService } from './fornecedor.service';

const listaSchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().trim().max(200).optional(),
  ativo: z.enum(['ativos', 'inativos']).optional(),
});

/** Cadastro de fornecedores (Cadastros › Fornecedores › Fornecedores). */
@Controller('cadastros/fornecedores')
export class FornecedorController {
  constructor(private readonly service: FornecedorService) {}

  @Get()
  @RequirePermission('fornecedor.gerenciar')
  lista(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(listaSchema)) query: z.infer<typeof listaSchema>,
  ) {
    return this.service.listar(context, {
      ...(query.q ? { termo: query.q } : {}),
      limite: query.limit,
      cursor: query.cursor ?? null,
      ...(query.ativo ? { ativo: query.ativo === 'ativos' } : {}),
    });
  }

  @Get(':id')
  @RequirePermission('fornecedor.gerenciar')
  buscar(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.buscar(context, id);
  }

  @Get(':id/documentos')
  @RequirePermission('fornecedor.gerenciar')
  documentos(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.documentos(context, id);
  }

  @Post()
  @RequirePermission('fornecedor.gerenciar')
  @AuditedMutation({ domain: 'SUPPLIER', entity: 'Supplier', collection: 'suppliers' })
  criar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(fornecedorSchema)) input: FornecedorInput,
  ) {
    return this.service.criar(context, input, atorDoToken(auth));
  }

  @Put(':id')
  @RequirePermission('fornecedor.gerenciar')
  @AuditedMutation({ domain: 'SUPPLIER', entity: 'Supplier', collection: 'suppliers' })
  atualizar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(fornecedorSchema)) input: FornecedorInput,
  ) {
    return this.service.atualizar(context, id, input, atorDoToken(auth));
  }
}
