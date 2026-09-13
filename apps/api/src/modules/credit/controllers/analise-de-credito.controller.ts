import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, CurrentUser, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  decisaoSchema,
  filaQuerySchema,
  impressaoSchema,
  liberacaoSchema,
  limiteQuerySchema,
  observacaoSchema,
  registrarPedidoSchema,
  type DecisaoInput,
  type FilaQuery,
  type ImpressaoInput,
  type LiberacaoInput,
  type LimiteQuery,
  type ObservacaoInput,
  type RegistrarPedidoInput,
} from '../dto/credito.schemas';
import type { Ator } from '../entities/historico';
import { AnaliseDeCreditoService } from '../services/analise-de-credito.service';
import { DecisaoDeCreditoService } from '../services/decisao-de-credito.service';
import { DocumentosDoCreditoService } from '../services/documentos-do-credito.service';

/** Quem esta agindo, com o nome que vai aparecer no historico do pedido. */
const atorDe = (auth: DecodedIdToken): Ator => ({
  uid: auth.uid,
  nome: (typeof auth['name'] === 'string' && auth['name']) || auth.email || auth.uid,
});

@Controller('credit-analysis')
export class AnaliseDeCreditoController {
  constructor(
    private readonly service: AnaliseDeCreditoService,
    private readonly decisoes: DecisaoDeCreditoService,
    private readonly documentos: DocumentosDoCreditoService,
  ) {}

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

  /** Liberacao unica dos pedidos marcados — seguem para o faturamento. Os que
   *  estiverem fora da politica so passam com justificativa. */
  @Post('orders/liberar')
  @RequirePermission('financeiro.editar')
  liberar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(liberacaoSchema)) input: LiberacaoInput,
  ) {
    return this.decisoes.liberar(context, atorDe(auth), input.ids, input.justificativa ?? null);
  }

  @Get('orders/:id')
  @RequirePermission('financeiro.visualizar')
  pedido(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.pedido(context, id);
  }

  /** O pedido como documento: itens, titulos gerados e quem lancou. */
  @Get('orders/:id/detalhe')
  @RequirePermission('financeiro.visualizar')
  detalheDoPedido(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.documentos.pedido(context, id);
  }

  /** A nota fiscal do pedido, com os titulos que ela originou. */
  @Get('orders/:id/nota')
  @RequirePermission('financeiro.visualizar')
  nota(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.documentos.nota(context, id);
  }

  @Get('titulos/:id')
  @RequirePermission('financeiro.visualizar')
  titulo(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.documentos.titulo(context, id);
  }

  /** Aprovar, aprovar excepcionalmente ou reprovar um pedido. Alem do rastro
   *  no proprio pedido, a mudanca vai para o log de auditoria do tenant. */
  @Post('orders/:id/decisao')
  @HttpCode(200)
  @RequirePermission('financeiro.editar')
  @AuditedMutation({ domain: 'FINANCE', entity: 'PedidoDeVenda', collection: 'pedidosDeVenda' })
  decidir(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(decisaoSchema)) input: DecisaoInput,
  ) {
    return this.decisoes.decidir(context, atorDe(auth), id, input);
  }

  /** Registra que a analise foi aberta (no maximo uma vez por pessoa a cada 30 min). */
  @Post('orders/:id/visualizacao')
  @HttpCode(200)
  @RequirePermission('financeiro.visualizar')
  visualizar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
  ) {
    return this.decisoes.visualizar(context, atorDe(auth), id);
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
