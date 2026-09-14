import { getAdminFirestore } from '@synapse/firebase/admin';
import type { FiscalDocument } from '@synapse/types';
import { FiscalRepository } from './fiscal.repository';

/** Numeracao fiscal contra o emulador do Firestore: a mesma transacao que a API
 *  usa em producao, com emissoes simultaneas de verdade. Roda com
 *  `pnpm test:emulador`; sem FIRESTORE_EMULATOR_HOST fica de fora.
 *
 *  Cada teste usa um tenant proprio: nada aqui encosta em dado de outro. */

const noEmulador = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

noEmulador('numeração fiscal no Firestore (emulador)', () => {
  jest.setTimeout(60_000);

  let db: ReturnType<typeof getAdminFirestore>;
  let repositorio: FiscalRepository;
  beforeAll(() => {
    db = getAdminFirestore();
    repositorio = new FiscalRepository(db);
  });
  afterAll(async () => {
    await db.terminate();
  });

  let tenantId = '';
  beforeEach(() => {
    tenantId = `fiscal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  });

  const rascunho = (id: string, idempotencyKey = `chave-${id}`) =>
    ({
      id,
      tenantId,
      companyId: tenantId,
      kind: 'NFCE',
      environment: 'HOMOLOGACAO',
      status: 'PROCESSING',
      series: 1,
      accessKey: null,
      protocol: null,
      providerJobId: null,
      xml: null,
      sefazCode: null,
      sefazMessage: null,
      attempts: 0,
      idempotencyKey,
      issuedAt: null,
    }) satisfies Omit<FiscalDocument, 'number'>;

  const numeracao = () => ({
    companyId: tenantId,
    kind: 'NFCE' as const,
    series: 1,
    initialNumber: 100,
  });

  it('vinte caixas fechando venda ao mesmo tempo levam vinte números diferentes', async () => {
    const reservas = await Promise.all(
      Array.from({ length: 20 }, (_, indice) =>
        repositorio.reserveDocument(rascunho(`nota-${indice}`), numeracao()),
      ),
    );

    const numeros = reservas.map(({ document }) => document.number).sort((a, b) => a - b);
    expect(numeros).toEqual(Array.from({ length: 20 }, (_, indice) => 100 + indice));
    const sequencia = await db.doc(`tenants/${tenantId}/fiscalSequences/NFCE-1`).get();
    expect(sequencia.data()?.['lastNumber']).toBe(119);
  });

  it('a mesma venda enviada dez vezes ao mesmo tempo vira uma nota só', async () => {
    const reservas = await Promise.all(
      Array.from({ length: 10 }, (_, indice) =>
        repositorio.reserveDocument(
          rascunho(`tentativa-${indice}`, 'pos-nfce:venda-1'),
          numeracao(),
        ),
      ),
    );

    expect(new Set(reservas.map(({ document }) => document.id)).size).toBe(1);
    expect(reservas.filter(({ replayed }) => !replayed)).toHaveLength(1);
    expect(await repositorio.listByTenant(tenantId)).toHaveLength(1);
    const { document } = await repositorio.reserveDocument(rascunho('seguinte'), numeracao());
    expect(document.number).toBe(101);
  });

  it('grava nota e fila com campos undefined sem o Firestore recusar', async () => {
    const { document } = await repositorio.reserveDocument(rascunho('nota-1'), numeracao());
    await repositorio.enqueueNfce({
      documentId: document.id,
      tenantId,
      companyId: tenantId,
      payload: { consumidor: undefined, itens: [{ codigoBarras: undefined, valor: 10 }] },
      idempotencyKey: 'pos-nfce:venda-1:contingency',
      queuedAt: new Date().toISOString(),
    });

    const [item] = await repositorio.listQueuedNfce(tenantId);
    expect(item?.payload).toEqual({ itens: [{ valor: 10 }] });
  });
});
