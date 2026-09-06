import { SYSTEM_ROLE_KEYS } from '@synapse/types';
import { DEFAULT_ROLE_PERMISSIONS } from '../permission-catalog';
import { RoleRepository } from '../repositories/role.repository';
import { RoleService } from './role.service';
import type { TenantContext } from '../iam.types';

const buildTenant = (overrides: Partial<TenantContext> = {}): TenantContext => ({
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
  ...overrides,
});

describe('RoleService — cargos padrao', () => {
  const service = new RoleService(new RoleRepository());

  it('lista as oito roles do §3, na ordem definida', () => {
    const views = service.list(buildTenant());
    const systemKeys = views.filter((view) => !view.isCustom).map((view) => view.systemKey);
    expect(systemKeys).toEqual([...SYSTEM_ROLE_KEYS]);
  });

  it.each(SYSTEM_ROLE_KEYS)('resolve as permissoes fixas de %s', (key) => {
    const tenant = buildTenant({ roleIds: [key] });
    for (const grant of DEFAULT_ROLE_PERMISSIONS[key]) {
      expect(service.hasPermission(tenant, grant.permission)).toBe(true);
    }
  });

  it('SUPER_ADMIN_SAAS e ADMIN_EMPRESA cobrem toda permissao do catalogo', () => {
    const allPermissions = new Set(
      SYSTEM_ROLE_KEYS.flatMap((key) => DEFAULT_ROLE_PERMISSIONS[key].map((g) => g.permission)),
    );
    const superAdmin = new Set(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN_SAAS.map((g) => g.permission));
    expect(superAdmin).toEqual(allPermissions);
  });

  it('VENDEDOR nao tem permissao de fiscal.emitir nem financeiro', () => {
    const tenant = buildTenant({ roleIds: ['VENDEDOR'] });
    expect(service.hasPermission(tenant, 'fiscal.emitir')).toBe(false);
    expect(service.hasPermission(tenant, 'financeiro.editar')).toBe(false);
  });
});

describe('RoleService — cargo personalizado', () => {
  it('cria, edita e recusa mexer num cargo padrao', () => {
    const repository = new RoleRepository();
    const service = new RoleService(repository);
    const tenant = buildTenant();

    const created = service.create(tenant, {
      name: 'Supervisor Regional',
      permissions: [{ permission: 'produto.visualizar' }],
    });
    expect(created.isCustom).toBe(true);

    const updated = service.update(tenant, created.id, { name: 'Supervisor Norte' });
    expect(updated.name).toBe('Supervisor Norte');

    expect(() => service.update(tenant, 'ADMIN_EMPRESA', { name: 'x' })).toThrow();
    expect(() => service.remove(tenant, 'ADMIN_EMPRESA')).toThrow();
  });

  it('nao vaza cargo personalizado de outro tenant', () => {
    const repository = new RoleRepository();
    const service = new RoleService(repository);
    service.create(buildTenant({ tenantId: 'tenant-a' }), {
      name: 'Cargo A',
      permissions: [{ permission: 'produto.visualizar' }],
    });
    const viewsB = service.list(buildTenant({ tenantId: 'tenant-b' }));
    expect(viewsB.some((v) => v.name === 'Cargo A')).toBe(false);
  });
});

describe('RoleService — escopo por filial (exemplo do §3: Supervisor Regional)', () => {
  it('concede a permissao so nas filiais do escopo do grant', () => {
    const repository = new RoleRepository();
    const service = new RoleService(repository);
    const tenant = buildTenant();
    const role = service.create(tenant, {
      name: 'Supervisor Regional',
      permissions: [
        { permission: 'produto.visualizar' },
        { permission: 'estoque.visualizar', scope: { branchIds: ['goiania', 'anapolis'] } },
        { permission: 'venda.cancelar', scope: { branchIds: ['goiania'] } },
      ],
    });
    const supervisor = buildTenant({ roleIds: [role.id], branchIds: ['goiania', 'anapolis'] });

    expect(service.hasPermission(supervisor, 'estoque.visualizar', 'goiania')).toBe(true);
    expect(service.hasPermission(supervisor, 'estoque.visualizar', 'anapolis')).toBe(true);
    expect(service.hasPermission(supervisor, 'venda.cancelar', 'goiania')).toBe(true);
    expect(service.hasPermission(supervisor, 'venda.cancelar', 'anapolis')).toBe(false);
    expect(service.hasPermission(supervisor, 'fiscal.emitir', 'goiania')).toBe(false);
  });

  it('membership sem filial (branchIds vazio) nao restringe — e o caso do admin da empresa', () => {
    const repository = new RoleRepository();
    const service = new RoleService(repository);
    const admin = buildTenant({ roleIds: ['ADMIN_EMPRESA'], branchIds: [] });
    expect(service.hasPermission(admin, 'filial.configurar', 'qualquer-filial')).toBe(true);
  });

  it('membership com filiais restringe mesmo quando o grant nao tem escopo', () => {
    const repository = new RoleRepository();
    const service = new RoleService(repository);
    const gerente = buildTenant({ roleIds: ['GERENTE'], branchIds: ['goiania'] });
    expect(service.hasPermission(gerente, 'venda.criar', 'goiania')).toBe(true);
    expect(service.hasPermission(gerente, 'venda.criar', 'anapolis')).toBe(false);
  });
});
