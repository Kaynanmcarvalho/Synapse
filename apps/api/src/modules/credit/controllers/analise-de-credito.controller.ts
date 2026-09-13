import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, CurrentUser, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  cadastroSchema,
  filaQuerySchema,
  impressaoSchema,
  liberacaoSchema,
  limiteQuerySchema,
  observacaoSchema,
  registrarPedidoSchema,
  type CadastroInput,
  type FilaQuery,
  type ImpressaoInput,
  type LiberacaoInput,
  type LimiteQuery,
  type ObservacaoInput,
  type RegistrarPedidoInput,
} from '../dto/credito.schemas';
import type { Ator } from '../entities/historico';
import { AnaliseDeCreditoService } from '../services/analise-de-credito.service';

/** Quem esta agindo, com o nome que vai aparecer no historico do pedido. */
const atorDe = (auth: DecodedIdToken): Ator => ({
  uid: auth.uid,
  nome: (typeof auth['name'] === 'string' && auth['name']) || auth.email || auth.uid,
});

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

  @Get('customers/:customerId/cadastro')
  @RequirePermission('financeiro.visualizar')
  cadastro(@CurrentTenant() context: TenantContext, @Param('customerId') customerId: string) {
    return this.service.cadastro(context, customerId);
  }

  @Put('customers/:customerId/cadastro')
  @RequirePermission('cliente.gerenciar')
  salvarCadastro(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('customerId') customerId: string,
    @Body(new ZodValidationPipe(cadastroSchema)) input: CadastroInput,
  ) {
    return this.service.salvarCadastro(context, atorDe(auth), customerId, input);
  }

  /** Liberacao unica dos pedidos marcados — seguem para o faturamento. */
  @Post('orders/liberar')
  @RequirePermission('financeiro.editar')
  liberar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(liberacaoSchema)) input: LiberacaoInput,
  ) {
    return this.service.liberar(context, atorDe(auth), input.ids);
  }

  @Get('orders/:id')
  @RequirePermission('financeiro.visualizar')
  pedido(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.pedido(context, id);
  }

  @Post('orders/:id/observacoes')
  @RequirePermission('financeiro.visualizar')
  observar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(observacaoSchema)) input: ObservacaoInput,
  ) {
    return this.service.observar(context, atorDe(auth), id, input.texto);
  }

  /** Controle de impressao: cada usuario marca o que ja imprimiu. */
  @Post('orders/:id/impressao')
  @RequirePermission('financeiro.visualizar')
  marcarImpressao(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(impressaoSchema)) input: ImpressaoInput,
  ) {
    return this.service.marcarImpressao(context, atorDe(auth), id, input.impresso);
  }

  /** Entrada do pedido do vendedor: mesma rota para desktop e celular. */
  @Post('orders')
  @RequirePermission('venda.criar')
  registrar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(registrarPedidoSchema)) input: RegistrarPedidoInput,
  ) {
    return this.service.registrar(context, atorDe(auth), input);
  }
}
