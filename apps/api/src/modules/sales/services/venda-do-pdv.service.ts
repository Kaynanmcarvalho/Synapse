import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  asProductId,
  PRODUCT_STATUS_ALLOWS_SALE,
  type Funcionario,
  type ImpressaoDoPedido,
  type PosItem,
  type PosPayment,
  type PosSale,
} from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { ClienteRepository } from '../../catalog/repositories/cliente.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import { PricingService } from '../../catalog/services/pricing.service';
import { FuncionarioRepository } from '../../cadastros/funcionarios/funcionario.repository';
import { podeVender } from '../../cadastros/funcionarios/pode-vender';
import { EmpresaDaImpressaoService } from '../../cadastros/impressao/empresa-da-impressao.service';
import { impressaoDaVenda } from '../../cadastros/impressao/montar-impressao';
import { TabelaService } from '../../cadastros/tabelas/tabela.service';
import type { TenantContext } from '../../iam/iam.types';
import { InventoryService } from '../../inventory/services/inventory.service';
import type { CompletePosSaleInput } from '../dto/pos.schemas';
import { CashSessionRepository } from '../repositories/cash-session.repository';
import { fecharPagamento, METODO_DO_MEIO } from './pagamentos-do-pdv';
import { PosService, type PosFiscalIssuer } from './pos.service';

interface DadosDaVenda {
  readonly context: TenantContext;
  readonly numero: number;
  readonly branchId: PosSale['branchId'];
  readonly cashSessionId: string;
  readonly input: CompletePosSaleInput;
  readonly vendedor: Funcionario | null;
  readonly itens: readonly PosItem[];
  readonly fechamento: {
    readonly pagamentos: readonly PosPayment[];
    readonly trocoCentavos: number;
  };
  readonly totais: Pick<PosSale, 'subtotal' | 'discount' | 'surcharge' | 'total'>;
}

/** A venda antes da NFC-e: o que foi vendido, por quem, para quem e como pagou. */
function rascunhoDaVenda(dados: DadosDaVenda): Omit<PosSale, 'nfceDocumentId'> {
  const { context, input, vendedor } = dados;
  return {
    id: randomUUID(),
    numero: dados.numero,
    tenantId: context.tenantId as PosSale['tenantId'],
    branchId: dados.branchId,
    modo: input.modo,
    cashSessionId: dados.cashSessionId,
    customerId: (input.customerId ?? null) as PosSale['customerId'],
    customerTaxId: input.customerTaxId ?? null,
    clienteNome: input.clienteNome ?? null,
    sellerId: vendedor?.id ?? input.sellerId ?? context.userId,
    vendedorNome: vendedor?.nome ?? null,
    vendedorCodigo: vendedor?.codigo ?? null,
    mesaOuCartao: input.mesaOuCartao ?? null,
    items: dados.itens,
    payments: dados.fechamento.pagamentos,
    ...dados.totais,
    trocoCentavos: dados.fechamento.trocoCentavos,
    situacao: 'CONCLUIDA',
    operadorId: context.userId,
    completedAt: new Date().toISOString(),
  };
}

/** Cancela a NFC-e da venda — a porta do módulo fiscal. */
export interface PosFiscalCanceller {
  cancel(
    tenantId: string,
    documentId: string,
    input: { justification: string; idempotencyKey: string },
  ): Promise<unknown>;
}

/** A venda do PDV (Venda PDV NFC-e e Venda PDV Balcão): preço e descrição do
 *  catálogo, vendedor do cadastro de funcionários, formas de pagamento da tabela,
 *  troco, baixa de estoque e, no modo NFC-e, o cupom fiscal. */
@Injectable()
export class VendaDoPdvService {
  private readonly logger = new Logger(VendaDoPdvService.name);

  constructor(
    private readonly caixas: PosService,
    private readonly repository: CashSessionRepository,
    private readonly pricing: PricingService,
    private readonly produtos: ProductRepository,
    private readonly funcionarios: FuncionarioRepository,
    private readonly tabelas: TabelaService,
    private readonly inventory: InventoryService,
    private readonly clientes: ClienteRepository,
    private readonly empresa: EmpresaDaImpressaoService,
  ) {}

  async concluir(
    context: TenantContext,
    sessionId: string,
    input: CompletePosSaleInput,
    fiscal: PosFiscalIssuer,
  ): Promise<PosSale> {
    const session = await this.caixas.openSession(context, sessionId);
    const vendedor = await this.vendedor(context, input.funcionarioId ?? null);
    const itens = await this.itens(context, session.branchId, input);
    const subtotal = itens.reduce(
      (soma, item) => soma + Math.round((item.quantity * item.unitPrice) / 1000),
      0,
    );
    const discount = itens.reduce((soma, item) => soma + item.discount, 0);
    const surcharge = itens.reduce((soma, item) => soma + item.surcharge, 0);
    const total = subtotal - discount + surcharge;
    const limite = vendedor
      ? vendedor.comissao.descontoMaximoPercentual
      : await this.pricing.getSellerDiscountLimit(context, context.userId);
    if (discount * 100 > subtotal * limite)
      throw new BadRequestException(`Desconto acima do limite de ${limite}% do vendedor`);

    const fechamento = fecharPagamento(total, await this.pagamentos(context, input));
    const numero = await this.repository.proximoNumero(context.tenantId);
    const rascunho = rascunhoDaVenda({
      context,
      numero,
      branchId: session.branchId,
      cashSessionId: session.id,
      input,
      vendedor,
      itens,
      fechamento,
      totais: { subtotal, discount, surcharge, total },
    });
    const nfceDocumentId =
      input.modo === 'NFCE'
        ? await fiscal.issueNfce(context.tenantId, input.companyId ?? context.tenantId, rascunho)
        : null;
    const venda = await this.repository.saveSale(context.tenantId, { ...rascunho, nfceDocumentId });
    await this.movimentarEstoque(context, venda, session.warehouseId ?? 'deposito-1', -1);
    await this.repository.save({
      ...session,
      expectedCash: session.expectedCash + fechamento.dinheiroNaGaveta,
    });
    return venda;
  }

  /** Ctrl+D do PDV: cancela a venda concluída deste caixa. A NFC-e é cancelada
   *  na SEFAZ antes; o estoque volta e a gaveta devolve o dinheiro. */
  async cancelar(
    context: TenantContext,
    saleId: string,
    motivo: string,
    fiscal: PosFiscalCanceller,
  ): Promise<PosSale> {
    const venda = await this.buscar(context, saleId);
    if (venda.situacao === 'CANCELADA') throw new BadRequestException('A venda já está cancelada');
    const session = await this.caixas.openSession(context, venda.cashSessionId);
    if (venda.nfceDocumentId)
      await fiscal.cancel(context.tenantId, venda.nfceDocumentId, {
        justification: motivo,
        idempotencyKey: `pdv-cancelamento:${venda.id}`,
      });
    const cancelada: PosSale = {
      ...venda,
      situacao: 'CANCELADA',
      canceladaEm: new Date().toISOString(),
      canceladaPor: context.userId,
      motivoDoCancelamento: motivo,
    };
    await this.repository.saveSale(context.tenantId, cancelada);
    await this.movimentarEstoque(context, venda, session.warehouseId ?? 'deposito-1', 1);
    const dinheiro = venda.payments
      .filter((pagamento) => pagamento.method === 'CASH')
      .reduce((soma, pagamento) => soma + pagamento.amount, 0);
    await this.repository.save({ ...session, expectedCash: session.expectedCash - dinheiro });
    return cancelada;
  }

  async buscar(context: TenantContext, id: string): Promise<PosSale> {
    const venda = await this.repository.findSale(context.tenantId, id);
    if (!venda) throw new NotFoundException('Venda não encontrada');
    return venda;
  }

  async historico(context: TenantContext, sessionId: string): Promise<PosSale[]> {
    const session = await this.repository.find(context.tenantId, sessionId);
    if (!session || session.operatorId !== context.userId)
      throw new NotFoundException('Caixa não encontrado');
    return this.repository.listSales(context.tenantId, sessionId);
  }

  async impressao(context: TenantContext, id: string): Promise<ImpressaoDoPedido> {
    const venda = await this.buscar(context, id);
    const [empresa, cliente] = await Promise.all([
      this.empresa.empresa(context.tenantId),
      venda.customerId
        ? this.clientes.buscar(context.tenantId, venda.customerId)
        : Promise.resolve(null),
    ]);
    return impressaoDaVenda(venda, empresa, cliente);
  }

  private async vendedor(
    context: TenantContext,
    funcionarioId: string | null,
  ): Promise<Funcionario | null> {
    if (!funcionarioId) return null;
    const funcionario = await this.funcionarios.buscar(context.tenantId, funcionarioId);
    if (!funcionario) throw new BadRequestException('Vendedor não encontrado');
    if (!podeVender(funcionario))
      throw new BadRequestException(
        `${funcionario.codigo} - ${funcionario.nome} não pode vender (bloqueado, demitido ou não é vendedor)`,
      );
    return funcionario;
  }

  private async itens(
    context: TenantContext,
    branchId: string,
    input: CompletePosSaleInput,
  ): Promise<PosItem[]> {
    const catalogo = await this.produtos.findMany(
      context.tenantId,
      input.items.map((item) => item.productId),
    );
    const precificados = await this.pricing.priceSaleItems(
      context,
      branchId,
      input.customerId ?? null,
      input.items.map((item) => {
        const produto = catalogo.get(item.productId);
        if (!produto) throw new BadRequestException('Produto da venda não existe mais no cadastro');
        if (!PRODUCT_STATUS_ALLOWS_SALE[produto.status])
          throw new BadRequestException(
            `${produto.sku} - ${produto.name} não pode ser vendido (${produto.status})`,
          );
        return {
          productId: asProductId(item.productId),
          barcode: item.barcode ?? produto.ean ?? null,
          description: produto.name,
          quantity: item.quantity,
          unitPrice: 0,
          discount: item.discount,
          surcharge: item.surcharge,
          total: 0,
          codigo: produto.sku,
          unidade: produto.logistics.unit,
          pesoUnitarioKg: produto.logistics.weightKg,
          lote: item.lote ?? null,
          serie: item.serie ?? null,
        };
      }),
    );
    return precificados;
  }

  private async pagamentos(
    context: TenantContext,
    input: CompletePosSaleInput,
  ): Promise<PosPayment[]> {
    return Promise.all(
      input.payments.map(async (pagamento) => {
        if (!pagamento.formaCodigo) {
          return {
            method: pagamento.method ?? 'CASH',
            amount: pagamento.amount,
            reference: pagamento.reference ?? null,
          };
        }
        const forma = await this.tabelas.buscar(
          context,
          'formas-de-pagamento',
          pagamento.formaCodigo,
        );
        if (!forma.ativo)
          throw new BadRequestException(`${forma.codigo} - ${forma.nome} está inativa`);
        return {
          method: METODO_DO_MEIO[forma.meio ?? 'OUTROS'],
          amount: pagamento.amount,
          reference: pagamento.reference ?? null,
          formaCodigo: forma.codigo,
          formaNome: forma.nome,
        };
      }),
    );
  }

  /** Baixa (sinal -1) ou devolve (+1) o estoque da venda. O PDV não para por
   *  saldo: vende e deixa o estoque negativo aparecer no relatório. */
  private async movimentarEstoque(
    context: TenantContext,
    venda: PosSale,
    warehouseId: string,
    sinal: -1 | 1,
  ): Promise<void> {
    for (const [indice, item] of venda.items.entries()) {
      try {
        await this.inventory.move(
          context,
          {
            branchId: venda.branchId ?? '',
            warehouseId,
            productId: item.productId,
            quantity: item.quantity,
            sourceId: venda.id,
            destinationId: null,
            document: `PDV ${venda.numero ?? ''}`.trim(),
            reason:
              sinal < 0
                ? `Venda PDV nº ${venda.numero}`
                : `Cancelamento da venda PDV nº ${venda.numero}`,
            idempotencyKey: `pdv:${venda.id}:${sinal < 0 ? 'baixa' : 'devolucao'}:${indice}`,
            allowNegative: true,
          },
          sinal < 0 ? 'SALE' : 'RETURN',
          sinal * item.quantity,
        );
      } catch (erro) {
        this.logger.warn(
          `estoque da venda ${venda.id} item ${item.productId}: ${(erro as Error).message}`,
        );
      }
    }
  }
}
