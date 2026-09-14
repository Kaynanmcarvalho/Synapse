import type { Firestore } from '@synapse/firebase/admin';
import type { AuditActor, Supplier } from '@synapse/types';
import { fornecedorSchema } from '@synapse/validation';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { FornecedorRepository } from '../../catalog/repositories/fornecedor.repository';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { RoleService } from '../../iam/services/role.service';
import { PurchaseOrderRepository } from '../../purchasing/repositories/purchase-order.repository';
import { TabelaRepository } from '../tabelas/tabela.repository';
import { TabelaService } from '../tabelas/tabela.service';
import { FornecedorService } from './fornecedor.service';

const contexto: TenantContext = {
  tenantId: 'empresa-a',
  userId: 'user-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
};

const autor: AuditActor = {
  uid: 'user-1' as AuditActor['uid'],
  email: 'kaynan@empresa.com',
  name: 'Kaynan',
  source: 'api',
};

const entrada = (extra: Record<string, unknown> = {}) =>
  fornecedorSchema.parse({
    documento: '11222333000181',
    razaoSocial: 'Distribuidora Norte LTDA',
    nomeFantasia: 'Norte Rações',
    inscricaoEstadual: '101234567',
    endereco: { cep: '74230020', cidade: 'GOIÂNIA', uf: 'GO', cidadeCodigoIbge: '5208707' },
    ...extra,
  });

const montar = () => {
  const db = new FakeFirestore() as unknown as Firestore;
  const tabelas = new TabelaService(
    new TabelaRepository(db),
    new RoleService(new RoleRepository()),
  );
  const repositorio = new FornecedorRepository(db);
  return {
    db: db as unknown as FakeFirestore,
    tabelas,
    repositorio,
    service: new FornecedorService(
      repositorio,
      tabelas,
      new TituloRepository(db),
      new PurchaseOrderRepository(db),
    ),
  };
};

describe('FornecedorService', () => {
  it('cria com código sequencial, referências nas tabelas e autoria', async () => {
    const { service } = montar();
    const primeiro = await service.criar(contexto, entrada(), autor);
    const segundo = await service.criar(
      contexto,
      entrada({ documento: '11444777000161', razaoSocial: 'Agro Sul' }),
      autor,
    );
    expect([primeiro.codigo, segundo.codigo]).toEqual([1, 2]);
    expect(primeiro).toMatchObject({
      taxId: '11222333000181',
      legalName: 'Distribuidora Norte LTDA',
      tradeName: 'Norte Rações',
      praca: { codigo: 1, nome: 'GERAL' },
      grupo: { codigo: 1, nome: 'GERAL' },
      createdBy: { name: 'Kaynan' },
      version: 1,
    });
  });

  it('recusa o mesmo CNPJ em dois fornecedores', async () => {
    const { service } = montar();
    await service.criar(contexto, entrada(), autor);
    await expect(service.criar(contexto, entrada({ razaoSocial: 'Outro' }), autor)).rejects.toThrow(
      /1 - Distribuidora Norte/,
    );
  });

  it('recusa grupo que não existe na tabela', async () => {
    const { service } = montar();
    await expect(
      service.criar(contexto, entrada({ grupo: { codigo: 5, nome: 'ATACADO' } }), autor),
    ).rejects.toThrow(/Grupo: código 5/);
  });

  it('alterar mantém código, criação e o que a tela não edita', async () => {
    const { service, repositorio } = montar();
    const criado = await service.criar(contexto, entrada(), autor);
    await repositorio.atualizar({
      ...criado,
      productIds: ['produto-1'],
      safetyStockByProduct: { 'produto-1': 10 },
    } as unknown as Supplier);
    const alterado = await service.atualizar(
      contexto,
      criado.id,
      entrada({ nomeFantasia: 'Norte Pet', ativo: false }),
      { ...autor, name: 'Renier' },
    );
    expect(alterado).toMatchObject({
      codigo: 1,
      tradeName: 'Norte Pet',
      active: false,
      productIds: ['produto-1'],
      safetyStockByProduct: { 'produto-1': 10 },
      createdBy: { name: 'Kaynan' },
      updatedBy: { name: 'Renier' },
      version: 2,
    });
  });

  it('lista por razão social e acha por código, CNPJ e nome', async () => {
    const { service } = montar();
    await service.criar(contexto, entrada({ razaoSocial: 'Zebu Nutrição' }), autor);
    await service.criar(
      contexto,
      entrada({ documento: '11444777000161', razaoSocial: 'Agro Sul', nomeFantasia: '' }),
      autor,
    );
    const pagina = await service.listar(contexto, { limite: 10 });
    expect(pagina.itens.map((item) => item.razaoSocial)).toEqual(['Agro Sul', 'Zebu Nutrição']);
    expect((await service.listar(contexto, { termo: '2', limite: 10 })).itens[0]?.razaoSocial).toBe(
      'Agro Sul',
    );
    expect(
      (await service.listar(contexto, { termo: '11.222.333/0001-81', limite: 10 })).itens,
    ).toHaveLength(1);
    expect((await service.listar(contexto, { termo: 'zebu nutr', limite: 10 })).itens).toHaveLength(
      1,
    );
  });

  it('Documentos traz os títulos a pagar e os pedidos de compra do fornecedor', async () => {
    const { service, db } = montar();
    const fornecedor = await service.criar(contexto, entrada(), autor);
    db.semear(`tenants/empresa-a/titulos/t1`, {
      id: 't1',
      tipo: 'PAGAR',
      descricao: 'NF 123 parcela 1',
      fornecedorId: fornecedor.id,
      valorOriginalCentavos: 50_000,
      vencimento: '2099-01-10',
      status: 'ABERTO',
      liquidacoes: [],
    });
    db.semear(`tenants/empresa-a/titulos/t2`, {
      id: 't2',
      tipo: 'PAGAR',
      descricao: 'NF 100',
      fornecedorId: fornecedor.id,
      valorOriginalCentavos: 20_000,
      vencimento: '2026-01-10',
      status: 'QUITADO',
      liquidacoes: [{ valorCentavos: 20_000 }],
    });
    db.semear(`tenants/empresa-a/purchaseOrders/po1`, {
      id: 'po1',
      supplierId: fornecedor.id,
      status: 'APROVADO',
      items: [{ quantityOrdered: 10, unitCostCentavos: 1_500 }],
      createdAt: '2026-09-01T10:00:00.000Z',
    });
    const documentos = await service.documentos(contexto, fornecedor.id);
    expect(documentos.titulosEmAberto).toEqual([
      expect.objectContaining({ id: 't1', valorCentavos: 50_000 }),
    ]);
    expect(documentos.titulosPagos.map((titulo) => titulo.id)).toEqual(['t2']);
    expect(documentos.pedidosDeCompra).toEqual([
      expect.objectContaining({ id: 'po1', totalCentavos: 15_000, situacao: 'APROVADO' }),
    ]);
  });
});
