import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import type { AuditActor } from '@synapse/types';
import { clienteSchema, type ClienteInput } from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, CurrentUser, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  listaDeClientesSchema,
  situacaoFinanceiraSchema,
  type ListaDeClientesQuery,
  type SituacaoFinanceiraInput,
} from '../dto/cliente.dto';
import { ClienteService } from '../services/cliente.service';

/** Quem está salvando, com nome e e-mail do token: é o que a ficha mostra em
 *  "cadastrado em", "última alteração" e em cada referência anotada. O uid
 *  sozinho não diz nada a quem lê. */
const atorDe = (auth: DecodedIdToken): AuditActor => ({
  uid: auth.uid as AuditActor['uid'],
  email: auth.email ?? '',
  name: (typeof auth['name'] === 'string' && auth['name']) || '',
  source: 'api',
});

/** O cadastro de clientes. É a única porta para criar e alterar cliente — a
 *  análise de crédito, o PDV e a busca leem o mesmo documento por aqui. */
@Controller('catalog/customers')
export class ClienteController {
  constructor(private readonly service: ClienteService) {}

  @Get()
  @RequirePermission('cliente.gerenciar')
  lista(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(listaDeClientesSchema)) query: ListaDeClientesQuery,
  ) {
    return this.service.listar(context.tenantId, {
      ...(query.q ? { termo: query.q } : {}),
      limite: query.limit,
      cursor: query.cursor ?? null,
      ...(query.grupo ? { grupo: query.grupo } : {}),
      ...(query.situacao ? { situacao: query.situacao } : {}),
      ...(query.ativo ? { ativo: query.ativo === 'ativos' } : {}),
    });
  }

  /** Valores já usados em grupo, sub-grupo, praça, segmento e ramo. */
  @Get('sugestoes')
  @RequirePermission('cliente.gerenciar')
  sugestoes(@CurrentTenant() context: TenantContext) {
    return this.service.sugestoes(context.tenantId);
  }

  @Get(':id')
  @RequirePermission('cliente.gerenciar')
  cliente(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.buscar(context.tenantId, id);
  }

  @Post()
  @RequirePermission('cliente.gerenciar')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Customer', collection: 'customers' })
  criar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(clienteSchema)) input: ClienteInput,
  ) {
    return this.service.criar(context, input, atorDe(auth));
  }

  @Put(':id')
  @RequirePermission('cliente.gerenciar')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Customer', collection: 'customers' })
  atualizar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(clienteSchema)) input: ClienteInput,
  ) {
    return this.service.atualizar(context, id, input, atorDe(auth));
  }

  /** Bloquear ou liberar pela situação financeira, sem abrir a ficha inteira. */
  @Patch(':id/financial-status')
  @RequirePermission('cliente.gerenciar')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Customer', collection: 'customers' })
  situacao(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(situacaoFinanceiraSchema)) body: SituacaoFinanceiraInput,
  ) {
    return this.service.definirSituacaoFinanceira(context.tenantId, id, body.status, atorDe(auth));
  }
}
