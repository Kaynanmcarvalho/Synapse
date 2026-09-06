import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error('Execute somente pelo Firestore Emulator');
const project = process.env.GCLOUD_PROJECT ?? 'demo-synapse';
const app = getApps()[0] ?? initializeApp({ projectId: project });
const db = getFirestore(app);
const tenant = `index-check-${Date.now()}`;
const audit = db.collection(`tenants/${tenant}/auditLogs`);
const lots = db.collection(`tenants/${tenant}/lots`);
await Promise.all([
  audit
    .doc('a')
    .set({ id: 'a', userId: 'u1', entity: 'Product', occurredAt: '2026-01-01T00:00:00.000Z' }),
  audit
    .doc('b')
    .set({ id: 'b', userId: 'u1', entity: 'Sale', occurredAt: '2026-01-02T00:00:00.000Z' }),
  lots
    .doc('l1')
    .set({ id: 'l1', branchId: 'b1', warehouseId: 'w1', productId: 'p1', expiresAt: '2026-10-01' }),
]);
const [byUser, byEntity, fefo] = await Promise.all([
  audit.where('userId', '==', 'u1').orderBy('occurredAt', 'desc').limit(10).get(),
  audit.where('entity', '==', 'Product').orderBy('occurredAt', 'desc').limit(10).get(),
  lots
    .where('branchId', '==', 'b1')
    .where('warehouseId', '==', 'w1')
    .where('productId', '==', 'p1')
    .orderBy('expiresAt', 'asc')
    .limit(10)
    .get(),
]);
if (byUser.size !== 2 || byEntity.size !== 1 || fefo.size !== 1)
  throw new Error('Consulta indexada retornou resultado inesperado');
await db.recursiveDelete(db.doc(`tenants/${tenant}`));
process.stdout.write(
  `${JSON.stringify({ event: 'firestore_indexes_verified', project, queries: 3 })}\n`,
);
