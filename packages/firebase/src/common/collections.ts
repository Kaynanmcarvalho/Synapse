/** Caminhos das colecoes. Tudo que e de tenant nasce sob tenants/{tenantId}
 *  para que a regra de isolamento seja uma so, no prefixo. */
export const ROOT_TENANTS = 'tenants';

export const tenantPath = (tenantId: string): string => `${ROOT_TENANTS}/${tenantId}`;

export const COLLECTION = {
  tenants: ROOT_TENANTS,
  branches: 'branches',
  users: 'users',
  memberships: 'memberships',
  roles: 'roles',
  products: 'products',
  customers: 'customers',
  suppliers: 'suppliers',
  stockBalances: 'stockBalances',
  stockMovements: 'stockMovements',
  orders: 'orders',
  fiscalDocuments: 'fiscalDocuments',
  receivables: 'receivables',
  payables: 'payables',
  auditLogs: 'auditLogs',
} as const;

export type CollectionName = (typeof COLLECTION)[keyof typeof COLLECTION];

export const tenantCollection = (tenantId: string, name: CollectionName): string =>
  `${tenantPath(tenantId)}/${name}`;
