import { getAdminFirestore } from '@synapse/firebase/admin';
import type { BranchId, CashSession, PosSale, TenantId } from '@synapse/types';
import { CashSessionRepository } from './cash-session.repository';

/** Caixa e vendas do PDV contra o emulador do Firestore. Roda com
 *  `pnpm test:emulador`; sem FIRESTORE_EMULATOR_HOST fica de fora. */

const noEmulador = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

noEmulador('caixa do PDV no Firestore (emulador)', () => {
  jest.setTimeout(60_000);

  let db: ReturnType<typeof getAdminFirestore>;
  beforeAll(() => {
    db = getAdminFirestore();
  });
  afterAll(async () => {
    await db.terminate();
  });

  let tenantId = '';
  beforeEach(() => {
    tenantId = 'pdv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  });

  const caixa = (id: string, extra: Partial<CashSession> = {}): CashSession => ({
    id,
    tenantId: tenantId as TenantId,
    branchId: 'matriz' as BranchId,
    operatorId: 'operador-1',
    openedAt: new Date().toISOString(),
    closedAt: null,
    openingAmount: 0,
    expectedCash: 0,
    countedCash: null,
    difference: null,
    movements: [],
    ...extra,
  });

  it('dez caixas fechando venda ao mesmo tempo não repetem número', async () => {
    const repository = new CashSessionRepository(db);
    const numeros = await Promise.all(
      Array.from({ length: 10 }, () => repository.proximoNumero(tenantId)),
    );
    expect([...numeros].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('acha só o caixa aberto do operador na filial e lista as vendas da mais nova para a mais antiga', async () => {
    const repository = new CashSessionRepository(db);
    await repository.save(caixa('fechado', { closedAt: '2026-09-13T20:00:00.000Z' }));
    await repository.save(caixa('aberto'));
    await repository.save(caixa('outra-filial', { branchId: 'filial-2' as BranchId }));
    expect((await repository.findOpenByOperator(tenantId, 'matriz', 'operador-1'))?.id).toBe(
      'aberto',
    );
    expect(await repository.findOpenByOperator(tenantId, 'matriz', 'operador-2')).toBeUndefined();

    const venda = (id: string, completedAt: string) =>
      ({ id, cashSessionId: 'aberto', completedAt, items: [], payments: [] }) as unknown as PosSale;
    await repository.saveSale(tenantId, venda('v1', '2026-09-14T10:00:00.000Z'));
    await repository.saveSale(tenantId, venda('v2', '2026-09-14T11:00:00.000Z'));
    await repository.saveSale(tenantId, {
      ...venda('v3', '2026-09-14T12:00:00.000Z'),
      cashSessionId: 'fechado',
    });
    expect((await repository.listSales(tenantId, 'aberto')).map((item) => item.id)).toEqual([
      'v2',
      'v1',
    ]);
  });
});
