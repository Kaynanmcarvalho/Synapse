import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BranchId,
  CadastroDoCliente,
  CustomerId,
  ItemDoPedido,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
  PedidoNaFila,
  ProductId,
  ResultadoDaLiberacao,
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
  rascunhoDoCadastro,
  resumoFinanceiro,
  SEM_TITULOS,
  totalCentavosDe,
} from '../entities/analise-de-credito';
import type { CadastroInput, RegistrarPedidoInput } from '../dto/credito.schemas';
import { evento, type Ator } from '../entities/historico';
import { ClienteRepository } from '../repositories/cliente.repository';
import { PedidoDeVendaRepository } from '../repositories/pedido-de-venda.repository';

const hojeISO = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class AnaliseDeCreditoService {
  constructor(
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly titulos: TituloRepository,
    private readonly clientes: ClienteRepository,
  ) {}

  /** O pedido inteiro, para a janela de detalhe — tambem quando ele e aberto
   *  pela lupa de um titulo ou de uma nota, e nao so pela fila. */
  async pedido(context: TenantContext, id: string): Promise<PedidoDeVenda> {
    const pedido = await this.pedidos.buscar(context.tenantId, id);
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    return pedido;
  }

  /** Liberacao unica para os pedidos que o analista marcou: seguem para o
   *  faturamento, cada um com o rastro de quem liberou e quando. */
  liberar(
    context: TenantContext,
    ator: Ator,
    ids: readonly string[],
  ): Promise<ResultadoDaLiberacao> {
    return this.pedidos.liberar(context.tenantId, ids, ator);
  }

  /** Observacao escrita aqui e sempre da etapa de credito. */
  observar(context: TenantContext, ator: Ator, id: string, texto: string) {
    return this.pedidos.observar(context.tenantId, id, {
      id: randomUUID(),
      etapa: 'CREDITO',
      texto,
      em: new Date().toISOString(),
      porUid: ator.uid,
      porNome: ator.nome,
    });
  }

  /** Cadastro do cliente para o formulario. Sem cadastro gravado, abre um
   *  rascunho com o que o vendedor ja informou no ultimo pedido. */
  async cadastro(context: TenantContext, customerId: string): Promise<CadastroDoCliente> {
    const gravado = await this.clientes.buscar(context.tenantId, customerId);
    if (gravado) return gravado;
    const [ultimo] = await this.pedidos.doCliente(context.tenantId, customerId, 1);
    return rascunhoDoCadastro(customerId, ultimo ?? null);
  }

  salvarCadastro(
    context: TenantContext,
    ator: Ator,
    customerId: string,
    input: CadastroInput,
  ): Promise<CadastroDoCliente> {
    return this.clientes.salvar(
      context.tenantId,
      { ...input, id: customerId as CustomerId, updatedAt: null, updatedByName: null },
      ator,
    );
  }

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
  marcarImpressao(context: TenantContext, ator: Ator, id: string, impresso: boolean) {
    return this.pedidos.marcarImpressao(context.tenantId, id, ator, impresso);
  }

  /** Porta de entrada do pedido, venha do desktop ou do celular: os dois caem
   *  na mesma fila, com a mesma regra. O total NUNCA vem do corpo da
   *  requisicao — e somado aqui a partir dos itens. */
  async registrar(
    context: TenantContext,
    ator: Ator,
    input: RegistrarPedidoInput,
  ): Promise<PedidoDeVenda> {
    const agora = new Date().toISOString();
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
      vencimentosEmDias: input.vencimentosEmDias,
      prazoMedioEmDias: prazoMedio(input.vencimentosEmDias),
      formaDePagamento: input.formaDePagamento,
      totalCentavos: itens.reduce((soma, item) => soma + item.totalCentavos, 0),
      descontoCentavos: itens.reduce((soma, item) => soma + item.descontoCentavos, 0),
      itens,
      observacao: input.observacao,
      impressoPor: [],
      historico: [evento('LANCADO', 'VENDEDOR', ator, agora, `Enviado pelo ${input.origem}`)],
      observacoes: input.observacao
        ? [
            {
              id: randomUUID(),
              etapa: 'VENDEDOR',
              texto: input.observacao,
              em: agora,
              porUid: ator.uid,
              porNome: ator.nome,
            },
          ]
        : [],
      nota: null,
      enviadoEm: agora,
      analisadoEm: null,
      analisadoPor: null,
    });
  }
}
