import type { Firestore } from '@synapse/firebase/admin';
import type { Funcionario, Product } from '@synapse/types';
import { FakeFirestore } from './fake-firestore';
import { ClienteRepository } from '../src/modules/catalog/repositories/cliente.repository';
import { PricingRepository } from '../src/modules/catalog/repositories/pricing.repository';
import { ProductRepository } from '../src/modules/catalog/repositories/product.repository';
import { PricingService } from '../src/modules/catalog/services/pricing.service';
import { FuncionarioRepository } from '../src/modules/cadastros/funcionarios/funcionario.repository';
import { EmpresaDaImpressaoService } from '../src/modules/cadastros/impressao/empresa-da-impressao.service';
import { TabelaRepository } from '../src/modules/cadastros/tabelas/tabela.repository';
import { TabelaService } from '../src/modules/cadastros/tabelas/tabela.service';
import type { TenantContext } from '../src/modules/iam/iam.types';
import { RoleRepository } from '../src/modules/iam/repositories/role.repository';
import { RoleService } from '../src/modules/iam/services/role.service';
import type { InventoryService } from '../src/modules/inventory/services/inventory.service';
import { CashSessionRepository } from '../src/modules/sales/repositories/cash-session.repository';
import { PosService } from '../src/modules/sales/services/pos.service';
import { VendaDoPdvService } from '../src/modules/sales/services/venda-do-pdv.service';

/** O PDV montado sobre o Firestore de teste, com o estoque trocado por um
 *  registro de movimentos — é o que os testes do caixa e da venda conferem. */

export const CONTEXTO_DO_CAIXA: TenantContext = {
  tenantId: 'tenant',
  userId: 'operador-1',
  roleIds: ['CAIXA'],
  branchIds: ['matriz'],
  warehouseIds: [],
};

export const produtoDeTeste = (id: string, reais: number, extra: Partial<Product> = {}): Product =>
  ({
    id,
    tenantId: 'tenant',
    sku: `SKU-${id}`,
    name: `RACAO ${id.toUpperCase()}`,
    ean: null,
    status: 'active',
    logistics: { unit: 'SC', weightKg: 25, quantityPerPackage: 1 },
    pricing: { salePrice: reais },
    ...extra,
  }) as unknown as Product;

export const vendedorDeTeste = (extra: Partial<Funcionario> = {}): Funcionario =>
  ({
    id: 'func-15',
    tenantId: 'tenant',
    codigo: 15,
    nome: 'RENIER PANTOJA',
    bloqueado: false,
    demissao: null,
    comissao: {
      vendedor: true,
      percentualAVista: 2,
      percentualAPrazo: 3,
      base: 'FATURAMENTO',
      descontoMaximoPercentual: 10,
      metaMensalCentavos: 0,
    },
    documentos: { cpf: null },
    cargo: { codigo: 1, nome: 'GERAL' },
    departamento: { codigo: 1, nome: 'GERAL' },
    usuario: null,
    ...extra,
  }) as unknown as Funcionario;

export const montarPdv = () => {
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const movimentos: { kind: string; productId: string; delta: number }[] = [];
  const inventory = {
    move: async (
      _context: TenantContext,
      input: { productId: string },
      kind: string,
      delta: number,
    ) => {
      movimentos.push({ kind, productId: input.productId, delta });
      return {};
    },
  } as unknown as InventoryService;
  const produtos = new ProductRepository(db);
  const pricing = new PricingService(new PricingRepository(db), produtos);
  const repository = new CashSessionRepository(db);
  const caixas = new PosService(repository);
  const funcionarios = new FuncionarioRepository(db);
  const vendas = new VendaDoPdvService(
    caixas,
    repository,
    pricing,
    produtos,
    funcionarios,
    new TabelaService(new TabelaRepository(db), new RoleService(new RoleRepository())),
    inventory,
    new ClienteRepository(db),
    new EmpresaDaImpressaoService(db),
  );
  return { fake, db, produtos, pricing, repository, caixas, vendas, movimentos };
};
