import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PRODUCT_STATUS_ALLOWS_SALE,
  type Customer,
  type Funcionario,
  type ImpressaoDoPedido,
  type ItemDeTabela,
  type PedidoDeVenda,
  type Product,
} from '@synapse/types';
import { ClienteRepository } from '../../catalog/repositories/cliente.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { PricingService } from '../../catalog/services/pricing.service';
import { FuncionarioRepository } from '../../cadastros/funcionarios/funcionario.repository';
import { podeVender } from '../../cadastros/funcionarios/pode-vender';
import { EmpresaDaImpressaoService } from '../../cadastros/impressao/empresa-da-impressao.service';
import { impressaoDoPedido } from '../../cadastros/impressao/montar-impressao';
import { TabelaService } from '../../cadastros/tabelas/tabela.service';
import type { RegistrarPedidoInput } from '../../credit/dto/credito.schemas';
import type { Ator } from '../../credit/entities/historico';
import { PedidoDeVendaRepository } from '../../credit/repositories/pedido-de-venda.repository';
import { AnaliseDeCreditoService } from '../../credit/services/analise-de-credito.service';
import type { TenantContext } from '../../iam/iam.types';
import { lerCondicao, type PedidoDeBalcaoInput } from './pedido-de-balcao.schemas';

export interface SugestaoDoCliente {
  readonly produto: Product;
  readonly vezes: number;
  readonly ultimaCompraEm: string;
}

/** As recusas do Fechar Documento, cada uma dizendo ao balcão o que corrigir. */
function conferirPedido(
  cliente: Customer | null,
  vendedor: Funcionario | null,
  forma: ItemDeTabela,
): { readonly cliente: Customer; readonly vendedor: Funcionario } {
  if (!cliente) throw new BadRequestException('Cliente não encontrado');
  if (!cliente.active)
    throw new BadRequestException(`${cliente.codigo ?? ''} ${cliente.name} está inativo`.trim());
  if (!vendedor) throw new BadRequestException('Vendedor não encontrado');
  if (!podeVender(vendedor))
    throw new BadRequestException(
      `${vendedor.codigo} - ${vendedor.nome} não pode vender (bloqueado, demitido ou não é vendedor)`,
    );
  if (!forma.ativo) throw new BadRequestException(`${forma.codigo} - ${forma.nome} está inativa`);
  return { cliente, vendedor };
}

/** O Ponto de Vendas (Venda Balcão) do Syndata: o vendedor lança os produtos e
 *  fecha o documento; vira um pedido de venda com origem BALCAO, na mesma fila
 *  da análise de crédito e do faturamento que o app do vendedor usa. */
@Injectable()
export class PedidoDeBalcaoService {
  constructor(
    private readonly analise: AnaliseDeCreditoService,
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly clientes: ClienteRepository,
    private readonly produtos: ProductRepository,
    private readonly pricing: PricingService,
    private readonly funcionarios: FuncionarioRepository,
    private readonly tabelas: TabelaService,
    private readonly empresa: EmpresaDaImpressaoService,
  ) {}

  async registrar(
    context: TenantContext,
    ator: Ator,
    input: PedidoDeBalcaoInput,
  ): Promise<PedidoDeVenda> {
    const [clienteLido, vendedorLido, forma, catalogo] = await Promise.all([
      this.clientes.buscar(context.tenantId, input.customerId),
      this.funcionarios.buscar(context.tenantId, input.funcionarioId),
      this.tabelas.buscar(context, 'formas-de-pagamento', input.formaDePagamentoCodigo),
      this.produtos.findMany(
        context.tenantId,
        input.itens.map((item) => item.productId),
      ),
    ]);
    const { cliente, vendedor } = conferirPedido(clienteLido, vendedorLido, forma);

    const itens: RegistrarPedidoInput['itens'] = [];
    let bruto = 0;
    let desconto = 0;
    for (const item of input.itens) {
      const precificado = await this.itemPrecificado(
        context,
        { branchId: input.branchId, customerId: cliente.id },
        item,
        catalogo.get(item.productId),
      );
      bruto += precificado.bruto;
      desconto += precificado.item.descontoCentavos;
      itens.push(precificado.item);
    }
    const limite = vendedor.comissao.descontoMaximoPercentual;
    if (desconto * 100 > bruto * limite)
      throw new BadRequestException(
        `Desconto de ${((desconto / Math.max(bruto, 1)) * 100).toFixed(2).replace('.', ',')}% passa do limite de ${limite}% de ${vendedor.nome}`,
      );

    const condicao = lerCondicao(input.condicaoDePagamento);
    return this.analise.registrar(context, ator, {
      branchId: input.branchId,
      customerId: cliente.id,
      clienteNome: cliente.name,
      clienteDocumento: cliente.taxId || null,
      clienteCidade: cliente.address.city || null,
      clienteBairro: cliente.address.district || null,
      tipo: forma.meio === 'BONIFICACAO' ? 'BONIFICACAO' : input.tipo,
      origem: 'BALCAO',
      vendedorId: vendedor.usuario?.uid ?? null,
      vendedorNome: vendedor.nome,
      funcionarioId: vendedor.id,
      vendedorCodigo: vendedor.codigo,
      condicaoDePagamento:
        forma.meio === 'A_PRAZO' || condicao.dias.length ? condicao.rotulo : 'À vista',
      vencimentosEmDias: condicao.dias,
      formaDePagamento: `${forma.codigo} - ${forma.nome}`,
      freteCentavos: input.freteCentavos,
      acrescimoCentavos: input.acrescimoCentavos,
      entradaCentavos: 0,
      observacao: input.observacao,
      itens,
    });
  }

  /** Preço pela regra de preço do catálogo; o preço digitado, quando menor, vira desconto. */
  private async itemPrecificado(
    context: TenantContext,
    onde: { readonly branchId: string; readonly customerId: string },
    item: PedidoDeBalcaoInput['itens'][number],
    produto: Product | undefined,
  ): Promise<{ readonly item: RegistrarPedidoInput['itens'][number]; readonly bruto: number }> {
    if (!produto) throw new BadRequestException('Produto do pedido não existe mais no cadastro');
    if (!PRODUCT_STATUS_ALLOWS_SALE[produto.status])
      throw new BadRequestException(
        `${produto.sku} - ${produto.name} não pode ser vendido (${produto.status})`,
      );
    const resolvido = await this.pricing.resolvePrice(context, {
      productId: produto.id,
      branchId: onde.branchId,
      quantity: item.quantidade / 1000,
      customerId: onde.customerId,
    });
    const precoCentavos = Math.round(resolvido.price * 100);
    const bruto = Math.round((item.quantidade * precoCentavos) / 1000);
    const negociado =
      item.precoNegociadoCentavos !== null && item.precoNegociadoCentavos < precoCentavos
        ? bruto - Math.round((item.quantidade * item.precoNegociadoCentavos) / 1000)
        : 0;
    return {
      bruto,
      item: {
        productId: produto.id,
        descricao: produto.name,
        quantidade: item.quantidade,
        precoUnitarioCentavos: precoCentavos,
        descontoCentavos: Math.min(bruto, item.descontoCentavos + negociado),
        codigo: produto.sku,
        unidade: produto.logistics.unit,
        pesoUnitarioKg: produto.logistics.weightKg,
        lote: item.lote,
      },
    };
  }

  /** Ctrl+H: os pedidos do balcão, do mais novo para o mais antigo. */
  async historico(
    context: TenantContext,
    filtros: { readonly desde: string | null; readonly funcionarioId?: string },
  ): Promise<PedidoDeVenda[]> {
    return filtros.funcionarioId
      ? (
          await this.pedidos.porCampo(
            context.tenantId,
            'funcionarioId',
            filtros.funcionarioId,
            filtros.desde,
            200,
          )
        ).filter((pedido) => pedido.origem === 'BALCAO')
      : this.pedidos.porCampo(context.tenantId, 'origem', 'BALCAO', filtros.desde, 200);
  }

  async buscar(context: TenantContext, id: string): Promise<PedidoDeVenda> {
    const pedido = await this.pedidos.buscar(context.tenantId, id);
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    return pedido;
  }

  async impressao(context: TenantContext, id: string): Promise<ImpressaoDoPedido> {
    const pedido = await this.buscar(context, id);
    const [empresa, cliente] = await Promise.all([
      this.empresa.empresa(context.tenantId),
      this.clientes.buscar(context.tenantId, pedido.customerId),
    ]);
    return impressaoDoPedido(pedido, empresa, cliente);
  }

  /** Botão Sugestão: o que este cliente mais compra, pelos últimos pedidos. */
  async sugestoes(context: TenantContext, customerId: string): Promise<SugestaoDoCliente[]> {
    const pedidos = await this.pedidos.doCliente(context.tenantId, customerId, 60);
    const contagem = new Map<string, { vezes: number; ultima: string }>();
    for (const pedido of pedidos.filter((item) => item.situacao !== 'CANCELADO')) {
      for (const item of pedido.itens) {
        const atual = contagem.get(item.productId);
        contagem.set(item.productId, {
          vezes: (atual?.vezes ?? 0) + 1,
          ultima: atual && atual.ultima > pedido.enviadoEm ? atual.ultima : pedido.enviadoEm,
        });
      }
    }
    const maisComprados = [...contagem.entries()]
      .sort((a, b) => b[1].vezes - a[1].vezes)
      .slice(0, 15);
    const produtos = await this.produtos.findMany(
      context.tenantId,
      maisComprados.map(([id]) => id),
    );
    return maisComprados.flatMap(([id, dados]) => {
      const produto = produtos.get(id);
      return produto && PRODUCT_STATUS_ALLOWS_SALE[produto.status]
        ? [{ produto, vezes: dados.vezes, ultimaCompraEm: dados.ultima }]
        : [];
    });
  }
}
