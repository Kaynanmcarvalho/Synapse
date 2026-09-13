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
  TenantId,
  Titulo,
  UserId,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { RoleService } from '../../iam/services/role.service';
import {
  carteiraDoCliente,
  clienteDaAnalise,
  identificacaoDoTitulo,
  notasDosPedidos,
  prazoMedio,
  rascunhoDoCadastro,
  resumoFinanceiro,
  totalCentavosDe,
} from '../entities/analise-de-credito';
import { avaliarPedido, registroDaAvaliacao, resumoDaAvaliacao } from '../entities/avaliacao';
import { comportamentoFinanceiro, pontualidadeRecente } from '../entities/comportamento';
import type { CadastroInput, RegistrarPedidoInput } from '../dto/credito.schemas';
import { acionarAnalise, evento, type Ator } from '../entities/historico';
import { situacaoDeCredito } from '../entities/situacao-de-credito';
import { ClienteRepository } from '../repositories/cliente.repository';
import { PedidoDeVendaRepository } from '../repositories/pedido-de-venda.repository';
import { hojeNaOperacao, LeitorDeCredito } from './leitor-de-credito';
import { permissoesDaDecisao } from './permissoes-do-credito';

/** Um ano antes de `hoje`, no formato que o `enviadoEm` compara. */
const umAnoAntes = (hoje: string): string =>
  new Date(Date.parse(`${hoje}T00:00:00.000Z`) - 365 * 86_400_000).toISOString().slice(0, 10);

const agruparPorCliente = (titulos: readonly Titulo[]): Map<string, Titulo[]> => {
  const grupos = new Map<string, Titulo[]>();
  for (const titulo of titulos) {
    if (!titulo.customerId) continue;
    grupos.set(titulo.customerId, [...(grupos.get(titulo.customerId) ?? []), titulo]);
  }
  return grupos;
};

@Injectable()
export class AnaliseDeCreditoService {
  constructor(
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly titulos: TituloRepository,
    private readonly clientes: ClienteRepository,
    private readonly leitor: LeitorDeCredito,
    private readonly roles: RoleService,
  ) {}

  /** O pedido inteiro, para a janela de detalhe — tambem quando ele e aberto
   *  pela lupa de um titulo ou de uma nota, e nao so pela fila. */
  async pedido(context: TenantContext, id: string): Promise<PedidoDeVenda> {
    const pedido = await this.pedidos.buscar(context.tenantId, id);
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    return pedido;
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

  /** Fila do modal: o que chegou e ainda nao foi analisado, cada pedido com a
   *  situacao do cliente, a exposicao e os motivos. Titulos, cadastros e
   *  aprovados sao lidos em lote para todos os clientes da fila — tres idas ao
   *  banco por 30 clientes, e nao tres por pedido. */
  async fila(context: TenantContext, limite: number): Promise<PedidoNaFila[]> {
    const { tenantId } = context;
    const pedidos = await this.pedidos.aguardandoAnalise(tenantId, limite);
    const clientes = [...new Set(pedidos.map((pedido) => pedido.customerId))];
    const [titulos, cadastros, aprovados] = await Promise.all([
      this.titulos.listByClientes(tenantId, clientes),
      this.clientes.buscarVarios(tenantId, clientes),
      this.pedidos.aprovadosDosClientes(tenantId, clientes),
    ]);
    const agora = new Date();
    const hoje = hojeNaOperacao(agora);
    const porCliente = agruparPorCliente(titulos);
    const { parametros } = this.leitor;

    const situacoes = new Map(
      clientes.map((customerId) => [
        customerId,
        situacaoDeCredito({
          customerId,
          titulos: porCliente.get(customerId) ?? [],
          cadastro: cadastros.get(customerId) ?? null,
          aprovados,
          parametros,
          hoje,
          agora: agora.toISOString(),
        }),
      ]),
    );

    return pedidos.flatMap((pedido) => {
      const situacao = situacoes.get(pedido.customerId);
      if (!situacao) return [];
      return [
        {
          pedido,
          cliente: resumoFinanceiro(
            porCliente.get(pedido.customerId) ?? [],
            pedido.customerId,
            hoje,
          ),
          impresso: (pedido.impressoPor ?? []).includes(context.userId as UserId),
          avaliacao: resumoDaAvaliacao(pedido, situacao, parametros),
        },
      ];
    });
  }

  /** Tudo que a tela mostra de um cliente, numa chamada so: a analise e uma
   *  leitura de conjunto, e nao consultas soltas que chegam em ordens
   *  diferentes e mostram o cliente pela metade. */
  async painel(
    context: TenantContext,
    customerId: string,
    limite: number,
  ): Promise<PainelDeAnaliseDeCredito> {
    const { tenantId } = context;
    const agora = new Date();
    const hoje = hojeNaOperacao(agora);
    const [ultimosPedidos, emAnalise, faturados, doAno, dados] = await Promise.all([
      this.pedidos.doCliente(tenantId, customerId, limite),
      this.pedidos.doClientePorSituacao(tenantId, customerId, 'AGUARDANDO_ANALISE', limite),
      this.pedidos.doClientePorSituacao(tenantId, customerId, 'FATURADO', limite),
      this.pedidos.doClienteDesde(tenantId, customerId, umAnoAntes(hoje)),
      this.leitor.dados(tenantId, customerId),
    ]);

    const pedidosPorId = new Map(
      [...ultimosPedidos, ...emAnalise, ...faturados, ...doAno].map((pedido) => [
        pedido.id,
        pedido,
      ]),
    );
    const { parametros } = this.leitor;
    const situacao = this.leitor.situacao(customerId, dados, agora);
    const comportamento = comportamentoFinanceiro({
      customerId,
      titulos: dados.titulos,
      pedidos: doAno,
      parametros,
      hoje,
      identificar: (titulo) => {
        const { numero, parcela } = identificacaoDoTitulo(titulo, pedidosPorId);
        return `${numero} · ${parcela}`;
      },
    });
    const recentes = pontualidadeRecente(dados.titulos, customerId);
    const { cadastro } = dados;

    return {
      cliente: clienteDaAnalise(customerId, cadastro, emAnalise[0] ?? ultimosPedidos[0] ?? null),
      pedidosEmAnalise: emAnalise,
      totalEmAnaliseCentavos: totalCentavosDe(emAnalise),
      ultimosPedidos,
      ultimasNotas: notasDosPedidos([...pedidosPorId.values()], limite),
      carteira: carteiraDoCliente(dados.titulos, customerId, pedidosPorId, hoje, limite),
      situacao,
      comportamento,
      avaliacoes: emAnalise.map((pedido) =>
        avaliarPedido(pedido, situacao, comportamento, recentes, parametros),
      ),
      parametros,
      cadastro,
      permissoes: permissoesDaDecisao(this.roles, context),
    };
  }

  /** "Ja imprimi este" e marca de quem imprimiu, e nao do pedido. */
  marcarImpressao(context: TenantContext, ator: Ator, id: string, impresso: boolean) {
    return this.pedidos.marcarImpressao(context.tenantId, id, ator, impresso);
  }

  /** Porta de entrada do pedido, venha do desktop ou do celular: os dois caem
   *  na mesma fila, com a mesma regra. O total NUNCA vem do corpo da
   *  requisicao — e somado aqui a partir dos itens, do frete e do acrescimo.
   *  Na chegada, o Synapse avalia o pedido e grava por que ele esta em analise. */
  async registrar(
    context: TenantContext,
    ator: Ator,
    input: RegistrarPedidoInput,
  ): Promise<PedidoDeVenda> {
    const agora = new Date();
    const em = agora.toISOString();
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
    const totalCentavos =
      itens.reduce((soma, item) => soma + item.totalCentavos, 0) +
      input.freteCentavos +
      input.acrescimoCentavos;

    const [numero, dados] = await Promise.all([
      this.pedidos.proximoNumero(context.tenantId),
      this.leitor.dados(context.tenantId, input.customerId),
    ]);

    const pedido: PedidoDeVenda = {
      id: randomUUID(),
      numero,
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
      lancadoPor: { uid: ator.uid, nome: ator.nome },
      condicaoDePagamento: input.condicaoDePagamento,
      vencimentosEmDias: input.vencimentosEmDias,
      prazoMedioEmDias: prazoMedio(input.vencimentosEmDias),
      formaDePagamento: input.formaDePagamento,
      totalCentavos,
      descontoCentavos: itens.reduce((soma, item) => soma + item.descontoCentavos, 0),
      ...(input.freteCentavos > 0 ? { freteCentavos: input.freteCentavos } : {}),
      ...(input.acrescimoCentavos > 0 ? { acrescimoCentavos: input.acrescimoCentavos } : {}),
      ...(input.entradaCentavos > 0
        ? { entradaCentavos: Math.min(input.entradaCentavos, totalCentavos) }
        : {}),
      itens,
      observacao: input.observacao,
      impressoPor: [],
      historico: [evento('LANCADO', 'VENDEDOR', ator, em, `Enviado pelo ${input.origem}`)],
      observacoes: input.observacao
        ? [
            {
              id: randomUUID(),
              etapa: 'VENDEDOR',
              texto: input.observacao,
              em,
              porUid: ator.uid,
              porNome: ator.nome,
            },
          ]
        : [],
      nota: null,
      enviadoEm: em,
      analisadoEm: null,
      analisadoPor: null,
    };

    const situacao = this.leitor.situacao(input.customerId, dados, agora);
    return this.pedidos.criar(
      acionarAnalise(pedido, registroDaAvaliacao(pedido, situacao, this.leitor.parametros, em)),
    );
  }
}
