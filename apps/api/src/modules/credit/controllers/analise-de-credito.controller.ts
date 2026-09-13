import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  filaQuerySchema,
  impressaoSchema,
  limiteQuerySchema,
  registrarPedidoSchema,
  type FilaQuery,
  type ImpressaoInput,
  type LimiteQuery,
  type RegistrarPedidoInput,
} from '../dto/credito.schemas';
import { AnaliseDeCreditoService } from '../services/analise-de-credito.service';

@Controller('credit-analysis')
export class AnaliseDeCreditoController {
  constructor(private readonly service: AnaliseDeCreditoService) {}

  /** Fila de pedidos esperando analise — a lista que abre junto com a tela. */
  @Get('queue')
  @RequirePermission('financeiro.visualizar')
  fila(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(filaQuerySchema)) query: FilaQuery,
  ) {
    return this.service.fila(context, query.limit);
  }

  @Get('customers/:customerId')
  @RequirePermission('financeiro.visualizar')
  painel(
    @CurrentTenant() context: TenantContext,
    @Param('customerId') customerId: string,
    @Query(new ZodValidationPipe(limiteQuerySchema)) query: LimiteQuery,
  ) {
    return this.service.painel(context, customerId, query.limit);
  }

  /** Controle de impressao: cada usuario marca o que ja imprimiu. */
  @Post('orders/:id/impressao')
  @RequirePermission('financeiro.visualizar')
  marcarImpressao(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(impressaoSchema)) input: ImpressaoInput,
  ) {
    return this.service.marcarImpressao(context, id, input.impresso);
  }

  /** Entrada do pedido do vendedor: mesma rota para desktop e celular. */
  @Post('orders')
  @RequirePermission('venda.criar')
  registrar(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(registrarPedidoSchema)) input: RegistrarPedidoInput,
  ) {
    return this.service.registrar(context, input);
  }
}
