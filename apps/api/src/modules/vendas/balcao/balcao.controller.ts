import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import type { Ator } from '../../credit/entities/historico';
import { CurrentTenant, CurrentUser, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { pedidoDeBalcaoSchema, type PedidoDeBalcaoInput } from './pedido-de-balcao.schemas';
import { PedidoDeBalcaoService } from './pedido-de-balcao.service';

const atorDe = (auth: DecodedIdToken): Ator => ({
  uid: auth.uid,
  nome: (typeof auth['name'] === 'string' && auth['name']) || auth.email || auth.uid,
});

const historicoSchema = z.object({
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  funcionarioId: z.string().min(1).optional(),
});

/** Vendas › Venda Balcão (o "Ponto de Vendas" do Syndata). */
@Controller('vendas/balcao')
@RequirePermission('venda.criar')
export class BalcaoController {
  constructor(private readonly service: PedidoDeBalcaoService) {}

  @Post('pedidos')
  @AuditedMutation({ domain: 'SALES', entity: 'PedidoDeVenda', collection: 'pedidosDeVenda' })
  registrar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(pedidoDeBalcaoSchema)) input: PedidoDeBalcaoInput,
  ) {
    return this.service.registrar(context, atorDe(auth), input);
  }

  @Get('pedidos')
  historico(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(historicoSchema)) query: z.infer<typeof historicoSchema>,
  ) {
    return this.service.historico(context, {
      desde: query.desde ?? null,
      ...(query.funcionarioId ? { funcionarioId: query.funcionarioId } : {}),
    });
  }

  @Get('pedidos/:id')
  buscar(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.buscar(context, id);
  }

  @Get('pedidos/:id/impressao')
  impressao(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.impressao(context, id);
  }

  @Get('sugestoes/:customerId')
  sugestoes(@CurrentTenant() context: TenantContext, @Param('customerId') customerId: string) {
    return this.service.sugestoes(context, customerId);
  }
}
