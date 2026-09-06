import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const count = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} inválido`);
  return value;
};
const project = process.env.FIREBASE_PROJECT_ID;
if (!project) throw new Error('FIREBASE_PROJECT_ID não configurada');
const plan = {
  products: count('PERF_PRODUCTS', 100_000),
  customers: count('PERF_CUSTOMERS', 500_000),
  stockMovements: count('PERF_STOCK_MOVEMENTS', 1_000_000),
  sales: count('PERF_SALES', 1_000_000),
};
const total = Object.values(plan).reduce((sum, value) => sum + value, 0);
if (process.argv.includes('--dry-run')) {
  process.stdout.write(
    `${JSON.stringify({ event: 'performance_seed_plan', project, plan, total })}\n`,
  );
  process.exit(0);
}
if (process.env.PERF_SEED_CONFIRM !== `${project}:${total}`) {
  throw new Error('PERF_SEED_CONFIRM deve ser exatamente <projeto>:<total>');
}
if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.PERF_TARGET !== 'staging') {
  throw new Error('Massa de volume só pode rodar no emulador ou com PERF_TARGET=staging');
}

const app =
  getApps()[0] ??
  initializeApp({
    projectId: project,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }),
  });
const db = getFirestore(app);
const writer = db.bulkWriter();
const tenant = process.env.PERF_TENANT_ID ?? 'performance-tenant';
let queued = 0;
const writeCollection = async (collection, amount, build) => {
  for (let index = 0; index < amount; index += 1) {
    const id = `${collection}-${String(index).padStart(9, '0')}`;
    writer.set(db.doc(`tenants/${tenant}/${collection}/${id}`), build(id, index));
    queued += 1;
    if (queued % 5_000 === 0) await writer.flush();
  }
};
const timestamp = new Date().toISOString();
await writeCollection('products', plan.products, (id, index) => ({
  id,
  tenantId: tenant,
  sku: `SKU-${index}`,
  name: `Produto ${index}`,
  status: 'ACTIVE',
  createdAt: timestamp,
}));
await writeCollection('customers', plan.customers, (id, index) => ({
  id,
  tenantId: tenant,
  name: `Cliente ${index}`,
  taxId: String(index).padStart(11, '0'),
  createdAt: timestamp,
}));
await writeCollection('stockMovements', plan.stockMovements, (id, index) => ({
  id,
  tenantId: tenant,
  productId: `products-${String(index % Math.max(plan.products, 1)).padStart(9, '0')}`,
  quantity: 1_000,
  occurredAt: timestamp,
}));
await writeCollection('sales', plan.sales, (id, index) => ({
  id,
  tenantId: tenant,
  customerId: `customers-${String(index % Math.max(plan.customers, 1)).padStart(9, '0')}`,
  total: 10_000,
  completedAt: timestamp,
}));
await writer.close();
process.stdout.write(
  `${JSON.stringify({ event: 'performance_seed_completed', project, tenant, total })}\n`,
);
