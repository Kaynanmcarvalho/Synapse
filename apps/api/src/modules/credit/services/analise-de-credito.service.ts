import { Injectable } from '@nestjs/common';
import type {
  BranchId,
  CustomerId,
  ItemDoPedido,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
  PedidoNaFila,
  ProductId,
  TenantId,
  UserId,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import {
  carteiraDoCliente,
  notasDosPedidos,
  prazoMedio,
  resumoFinanceiro,
  SEM_TITULOS,
  totalCentavosDe,
} from '../entities/analise-de-credito';
import type { RegistrarPedidoInput } from '../dto/credito.schemas';
import { PedidoDeVendaRepository } from '../repositories/pedido-de-venda.repository';

const hojeISO = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class AnaliseDeCreditoService {
  constructor(
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly titulos: TituloRepository,
  ) {}

  /** Fila do modal: o que chegou e ainda nao foi analisado, cada pedido ja com
   *  a situacao financeira do cliente — sem isso o analista abriria um por um
   *  so para descobrir quem esta devendo. Os titulos sao lidos uma vez por
   *  cliente, e nao uma vez por pedido. */
  async fila(context: TenantContext, limite: number): Promise<PedidoNaFila[]> {
    const pedidos = await this.pedidos.aguardandoAnalise(context.tenantId, limite);
    const hoje = hojeISO();
    const clientes = [...new Set(pedidos.map((pedido) => pedido.customerId))];
    const resumos = new Map(
      await Promise.all(
        clientes.map(
          async (customerId) =>
            [
              customerId,
              resumoFinanceiro(
                await this.titulos.listByCliente(context.tenantId, customerId),
                customerId,
                hoje,
              ),
            ] as const,
        ),
      ),
    );

    return pedidos.map((pedido) => ({
      pedido,
      cliente: resumos.get(pedido.customerId) ?? SEM_TITULOS,
      impresso: (pedido.impressoPor ?? []).includes(context.userId as UserId),
    }));
  }

  /** Tudo que a tela mostra de um cliente, numa chamada so: a analise e uma
   *  leitura de conjunto, e nao quatro consultas soltas que chegam em ordens
   *  diferentes e mostram o cliente pela metade. */
  async painel(
    context: TenantContext,
    customerId: string,
    limite: number,
  ): Promise<PainelDeAnaliseDeCredito> {
    const { tenantId } = context;
    const [ultimosPedidos, emAnalise, faturados, titulos] = await Promise.all([
      this.pedidos.doCliente(tenantId, customerId, limite),
      this.pedidos.doClientePorSituacao(tenantId, customerId, 'AGUARDANDO_ANALISE', limite),
      this.pedidos.doClientePorSituacao(tenantId, customerId, 'FATURADO', limite),
      this.titulos.listByCliente(tenantId, customerId),
    ]);

    const pedidosPorId = new Map(
      [...ultimosPedidos, ...emAnalise, ...faturados].map((pedido) => [pedido.id, pedido]),
    );
    const referencia = emAnalise[0] ?? ultimosPedidos[0];

    return {
      cliente: {
        id: customerId as CustomerId,
        nome: referencia?.clienteNome ?? customerId,
        documento: referencia?.clienteDocumento ?? null,
      },
      pedidosEmAnalise: emAnalise,
      totalEmAnaliseCentavos: totalCentavosDe(emAnalise),
      ultimosPedidos,
      ultimasNotas: notasDosPedidos(faturados, limite),
      carteira: carteiraDoCliente(titulos, customerId, pedidosPorId, hojeISO(), limite),
    };
  }

  /** "Ja imprimi este" e marca de quem imprimiu, e nao do pedido. */
  marcarImpressao(context: TenantContext, id: string, impresso: boolean) {
    return this.pedidos.marcarImpressao(context.tenantId, id, context.userId, impresso);
  }

  /** Porta de entrada do pedido, venha do desktop ou do celular: os dois caem
   *  na mesma fila, com a mesma regra. O total NUNCA vem do corpo da
   *  requisicao — e somado aqui a partir dos itens. */
  async registrar(context: TenantContext, input: RegistrarPedidoInput): Promise<PedidoDeVenda> {
    const itens: ItemDoPedido[] = input.itens.map((item) => ({
      productId: item.productId as ProductId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      precoUnitarioCentavos: item.precoUnitarioCentavos,
      descontoCentavos: item.descontoCentavos,
      totalCentavos: Math.max(
        0,
        Math.round((item.quantidade * item.precoUnitarioCentavos) / 1000) - item.descontoCentavos,
      ),
    }));

    return this.pedidos.criar({
      id: randomUUID(),
      numero: await this.pedidos.proximoNumero(context.tenantId),
      tenantId: context.tenantId as TenantId,
      branchId: input.branchId as BranchId,
      customerId: input.customerId as CustomerId,
      clienteNome: input.clienteNome,
      clienteDocumento: input.clienteDocumento,
      clienteCidade: input.clienteCidade,
      clienteBairro: input.clienteBairro,
      tipo: input.tipo,
      situacao: 'AGUARDANDO_ANALISE',
      origem: input.origem,
      vendedorId: (input.vendedorId ?? context.userId) as UserId,
      vendedorNome: input.vendedorNome,
      condicaoDePagamento: input.condicaoDePagamento,
      prazoMedioEmDias: prazoMedio(input.vencimentosEmDias),
      formaDePagamento: input.formaDePagamento,
      totalCentavos: itens.reduce((soma, item) => soma + item.totalCentavos, 0),
      descontoCentavos: itens.reduce((soma, item) => soma + item.descontoCentavos, 0),
      itens,
      observacao: input.observacao,
      impressoPor: [],
      nota: null,
      enviadoEm: new Date().toISOString(),
      analisadoEm: null,
      analisadoPor: null,
    });
  }
}
