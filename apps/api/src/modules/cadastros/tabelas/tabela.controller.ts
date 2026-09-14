import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { TipoDeTabela } from '@synapse/types';
import {
  itemDeTabelaSchema,
  tipoDeTabelaSchema,
  type ItemDeTabelaInput,
} from '@synapse/validation';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, SkipPermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { TabelaService } from './tabela.service';

const filtrosSchema = z.object({
  q: z.string().trim().max(60).optional(),
  ativos: z.enum(['sim', 'nao']).optional(),
});

const codigoSchema = z.coerce.number().int().positive();

/** Tabelas auxiliares do Syndata (cargos, departamentos, praças, grupos de
 *  fornecedor, formas de pagamento). A leitura é de todo membro do tenant; a
 *  escrita confere a permissão da tabela no serviço. */
@Controller('cadastros/tabelas')
@SkipPermission()
export class TabelaController {
  constructor(private readonly service: TabelaService) {}

  @Get(':tipo')
  listar(
    @CurrentTenant() context: TenantContext,
    @Param('tipo', new ZodValidationPipe(tipoDeTabelaSchema)) tipo: TipoDeTabela,
    @Query(new ZodValidationPipe(filtrosSchema)) filtros: z.infer<typeof filtrosSchema>,
  ) {
    return this.service.listar(context, tipo, {
      ...(filtros.q ? { termo: filtros.q } : {}),
      somenteAtivos: filtros.ativos === 'sim',
    });
  }

  @Get(':tipo/:codigo')
  buscar(
    @CurrentTenant() context: TenantContext,
    @Param('tipo', new ZodValidationPipe(tipoDeTabelaSchema)) tipo: TipoDeTabela,
    @Param('codigo', new ZodValidationPipe(codigoSchema)) codigo: number,
  ) {
    return this.service.buscar(context, tipo, codigo);
  }

  @Post(':tipo')
  @AuditedMutation({ domain: 'LOOKUP', entity: 'ItemDeTabela', collection: 'tabelas' })
  criar(
    @CurrentTenant() context: TenantContext,
    @Param('tipo', new ZodValidationPipe(tipoDeTabelaSchema)) tipo: TipoDeTabela,
    @Body(new ZodValidationPipe(itemDeTabelaSchema)) input: ItemDeTabelaInput,
  ) {
    return this.service.criar(context, tipo, input);
  }

  @Put(':tipo/:codigo')
  @AuditedMutation({ domain: 'LOOKUP', entity: 'ItemDeTabela', collection: 'tabelas' })
  alterar(
    @CurrentTenant() context: TenantContext,
    @Param('tipo', new ZodValidationPipe(tipoDeTabelaSchema)) tipo: TipoDeTabela,
    @Param('codigo', new ZodValidationPipe(codigoSchema)) codigo: number,
    @Body(new ZodValidationPipe(itemDeTabelaSchema)) input: ItemDeTabelaInput,
  ) {
    return this.service.alterar(context, tipo, codigo, input);
  }
}
