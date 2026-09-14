import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuditActor,
  DocumentosDoFornecedor,
  FornecedorNaLista,
  LinhaDeTituloDoFornecedor,
  PaginaDeFornecedores,
  Supplier,
  SupplierId,
  TenantId,
  Titulo,
} from '@synapse/types';
import type { FornecedorInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import {
  FornecedorRepository,
  fornecedorNaLista,
} from '../../catalog/repositories/fornecedor.repository';
import { saldoCentavos, statusDe } from '../../finance/entities/titulo';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { PurchaseOrderRepository } from '../../purchasing/repositories/purchase-order.repository';
import { TabelaService } from '../tabelas/tabela.service';

export interface FiltrosDeFornecedores {
  readonly termo?: string;
  readonly limite: number;
  readonly cursor?: string | null;
  readonly ativo?: boolean;
}

/** Fornecedor gravado antes da ficha não guardou quem criou. */
const CADASTRO_ANTERIOR: AuditActor = {
  uid: 'cadastro-anterior' as AuditActor['uid'],
  email: '',
  name: 'Cadastro anterior (autor não registrado)',
  source: 'api',
};

/** O cadastro de fornecedores: criar, alterar, achar e o que o sistema já
 *  registrou com cada um (pedidos de compra e títulos a pagar). */
@Injectable()
export class FornecedorService {
  constructor(
    private readonly repositorio: FornecedorRepository,
    private readonly tabelas: TabelaService,
    private readonly titulos: TituloRepository,
    private readonly pedidosDeCompra: PurchaseOrderRepository,
  ) {}

  async listar(
    context: TenantContext,
    filtros: FiltrosDeFornecedores,
  ): Promise<PaginaDeFornecedores> {
    if (filtros.termo?.trim()) {
      const achados = await this.repositorio.procurar(
        context.tenantId,
        filtros.termo,
        filtros.limite,
      );
      const itens: FornecedorNaLista[] = achados
        .filter((fornecedor) => filtros.ativo === undefined || fornecedor.active === filtros.ativo)
        .map(fornecedorNaLista);
      return { itens, proximoCursor: null };
    }
    return this.repositorio.listar(context.tenantId, {
      limite: filtros.limite,
      cursor: filtros.cursor ?? null,
      ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
    });
  }

  async buscar(context: TenantContext, id: string): Promise<Supplier> {
    const fornecedor = await this.repositorio.buscar(context.tenantId, id);
    if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado');
    return fornecedor;
  }

  async criar(
    context: TenantContext,
    input: FornecedorInput,
    autor: AuditActor,
  ): Promise<Supplier> {
    const agora = new Date().toISOString();
    return this.repositorio.criar({
      ...(await this.ficha(context, input, null)),
      id: randomUUID() as SupplierId,
      tenantId: context.tenantId as TenantId,
      codigo: null,
      createdAt: agora,
      createdBy: autor,
      updatedAt: agora,
      updatedBy: autor,
      version: 1,
    });
  }

  async atualizar(
    context: TenantContext,
    id: string,
    input: FornecedorInput,
    autor: AuditActor,
  ): Promise<Supplier> {
    const anterior = await this.buscar(context, id);
    const agora = new Date().toISOString();
    return this.repositorio.atualizar({
      ...(await this.ficha(context, input, anterior)),
      id: anterior.id,
      tenantId: anterior.tenantId,
      codigo: anterior.codigo ?? null,
      createdAt: anterior.createdAt ?? agora,
      createdBy: anterior.createdBy ?? CADASTRO_ANTERIOR,
      updatedAt: agora,
      updatedBy: autor,
      version: (anterior.version ?? 0) + 1,
    });
  }

  async documentos(context: TenantContext, id: string): Promise<DocumentosDoFornecedor> {
    const fornecedor = await this.buscar(context, id);
    const [titulos, pedidos] = await Promise.all([
      this.titulos.listByFornecedor(context.tenantId, fornecedor.id),
      this.pedidosDeCompra.listBySupplier(context.tenantId, fornecedor.id),
    ]);
    const hoje = new Date().toISOString().slice(0, 10);
    const linha = (titulo: Titulo): LinhaDeTituloDoFornecedor => ({
      id: titulo.id,
      descricao: titulo.descricao,
      vencimento: titulo.vencimento,
      valorCentavos: titulo.valorOriginalCentavos,
      saldoCentavos: saldoCentavos(titulo),
      situacao: statusDe(titulo, hoje),
    });
    const aPagar = titulos
      .filter((titulo) => titulo.tipo === 'PAGAR')
      .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
    return {
      pedidosDeCompra: pedidos
        .map((pedido) => ({
          id: pedido.id,
          numero: pedido.id.slice(0, 8).toUpperCase(),
          situacao: pedido.status,
          totalCentavos: pedido.items.reduce(
            (soma, item) => soma + item.quantityOrdered * item.unitCostCentavos,
            0,
          ),
          criadoEm: pedido.createdAt,
        }))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
      titulosEmAberto: aPagar
        .filter((titulo) => !['QUITADO', 'CANCELADO', 'RENEGOCIADO'].includes(titulo.status))
        .map(linha),
      titulosPagos: aPagar.filter((titulo) => titulo.status === 'QUITADO').map(linha),
    };
  }

  /** O que a ficha grava, com as referências conferidas nas tabelas e o que a
   *  tela não edita (produtos, estoque de segurança, preço médio) preservado. */
  private async ficha(
    context: TenantContext,
    input: FornecedorInput,
    anterior: Supplier | null,
  ): Promise<
    Omit<
      Supplier,
      | 'id'
      | 'tenantId'
      | 'codigo'
      | 'createdAt'
      | 'createdBy'
      | 'updatedAt'
      | 'updatedBy'
      | 'version'
    >
  > {
    const [praca, grupo, subGrupo] = await Promise.all([
      this.tabelas.referencia(context, 'pracas', input.praca, 'Praça / Região'),
      this.tabelas.referencia(context, 'grupos-de-fornecedor', input.grupo, 'Grupo'),
      this.tabelas.referencia(context, 'subgrupos-de-fornecedor', input.subGrupo, 'Sub-grupo'),
    ]);
    const representante = input.representante.nome
      ? [
          {
            name: input.representante.nome,
            phone: input.representante.celular ?? input.representante.telefone ?? '',
            email: null,
          },
        ]
      : [];
    return {
      taxId: input.documento,
      stateRegistration: input.inscricaoEstadual,
      legalName: input.razaoSocial,
      tradeName: input.nomeFantasia,
      contacts: representante,
      paymentTermId: anterior?.paymentTermId ?? null,
      averageLeadDays: input.prazoMedioDeEntregaDias,
      ...(anterior?.safetyStockByProduct
        ? { safetyStockByProduct: anterior.safetyStockByProduct }
        : {}),
      averagePrice: anterior?.averagePrice ?? 0,
      productIds: anterior?.productIds ?? [],
      active: input.ativo,
      tipoDePessoa: input.tipoDePessoa,
      endereco: input.endereco,
      praca,
      grupo,
      subGrupo,
      regimeTributario: input.regimeTributario,
      observacao: input.observacao,
      telefone1: input.telefone1,
      telefone2: input.telefone2,
      fax: input.fax,
      site: input.site,
      email: input.email,
      emailNfe: input.emailNfe,
      indicadorIe: input.indicadorIe,
      inscricaoMunicipal: input.inscricaoMunicipal,
      representante: input.representante,
      escrituracao: input.escrituracao,
    };
  }
}
