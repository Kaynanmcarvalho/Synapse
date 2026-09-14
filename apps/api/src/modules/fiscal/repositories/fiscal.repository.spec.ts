import type { Firestore } from '@synapse/firebase/admin';
import type { FiscalDocument } from '@synapse/types';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { FiscalRepository } from './fiscal.repository';

const rascunho = (
  tenantId: string,
  id: string,
  idempotencyKey = `chave-${id}`,
): Omit<FiscalDocument, 'number'> => ({
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
});

const numeracao = (tenantId: string, initialNumber?: number) => ({
  companyId: tenantId,
  kind: 'NFCE' as const,
  series: 1,
  initialNumber,
});

describe('FiscalRepository no Firestore', () => {
  let db: FakeFirestore;
  const repositorio = () => new FiscalRepository(db as unknown as Firestore);

  beforeEach(() => {
    db = new FakeFirestore();
  });

  it('continua a numeração depois de a API reiniciar', async () => {
    const antes = repositorio();
    await antes.reserveDocument(rascunho('empresa-a', 'n1'), numeracao('empresa-a', 500));
    await antes.reserveDocument(rascunho('empresa-a', 'n2'), numeracao('empresa-a', 500));

    // Instância nova sobre o mesmo banco: o que a memória perdia no restart.
    const depois = repositorio();
    const { document } = await depois.reserveDocument(
      rascunho('empresa-a', 'n3'),
      numeracao('empresa-a', 500),
    );

    expect(document.number).toBe(502);
    expect((await depois.findDocument('empresa-a', 'n1'))?.number).toBe(500);
  });

  it('chave repetida devolve a nota que já existe sem gastar número', async () => {
    const repo = repositorio();
    const primeira = await repo.reserveDocument(
      rascunho('empresa-a', 'n1', 'pos-nfce:venda-1'),
      numeracao('empresa-a'),
    );
    const repetida = await repo.reserveDocument(
      rascunho('empresa-a', 'outro-id', 'pos-nfce:venda-1'),
      numeracao('empresa-a'),
    );
    const seguinte = await repo.reserveDocument(
      rascunho('empresa-a', 'n2', 'pos-nfce:venda-2'),
      numeracao('empresa-a'),
    );

    expect(primeira.replayed).toBe(false);
    expect(repetida).toMatchObject({ replayed: true, document: { id: 'n1', number: 1 } });
    expect(seguinte.document.number).toBe(2);
    expect(await repo.findDocument('empresa-a', 'outro-id')).toBeUndefined();
    expect((await repo.findByIdempotency('empresa-a', 'pos-nfce:venda-1'))?.id).toBe('n1');
  });

  it('o próximo número do assistente empurra para frente, mas nunca repete', async () => {
    const repo = repositorio();
    await repo.reserveDocument(rascunho('empresa-a', 'n1'), numeracao('empresa-a', 10));

    const recuo = await repo.reserveDocument(
      rascunho('empresa-a', 'n2'),
      numeracao('empresa-a', 3),
    );
    const salto = await repo.reserveDocument(
      rascunho('empresa-a', 'n3'),
      numeracao('empresa-a', 900),
    );

    expect(recuo.document.number).toBe(11);
    expect(salto.document.number).toBe(900);
  });

  it('séries e modelos têm sequências separadas', async () => {
    const repo = repositorio();
    await repo.reserveDocument(rascunho('empresa-a', 'n1'), numeracao('empresa-a'));
    const outraSerie = await repo.reserveDocument(rascunho('empresa-a', 'n2'), {
      ...numeracao('empresa-a'),
      series: 2,
    });
    const nfe = await repo.reserveDocument(rascunho('empresa-a', 'n3'), {
      ...numeracao('empresa-a'),
      kind: 'NFE',
    });

    expect(outraSerie.document.number).toBe(1);
    expect(nfe.document.number).toBe(1);
  });

  it('nota de um tenant não aparece para outro', async () => {
    const repo = repositorio();
    await repo.reserveDocument(rascunho('empresa-a', 'n1', 'mesma-chave'), numeracao('empresa-a'));
    db.acessos.length = 0;

    expect(await repo.findDocument('empresa-b', 'n1')).toBeUndefined();
    expect(await repo.findByIdempotency('empresa-b', 'mesma-chave')).toBeUndefined();
    expect(await repo.search('empresa-b', '1', 10)).toEqual([]);
    expect(db.caminhosTocados.some((path) => path.includes('empresa-a'))).toBe(false);
  });

  it('acha a nota pelo começo da chave de acesso, sem devolver os tokens da busca', async () => {
    const repo = repositorio();
    const { document } = await repo.reserveDocument(
      rascunho('empresa-a', 'n1'),
      numeracao('empresa-a'),
    );
    await repo.saveDocument({ ...document, status: 'AUTHORIZED', accessKey: '5226'.repeat(11) });

    const [achada] = await repo.search('empresa-a', '52265226', 10);

    expect(achada).toMatchObject({ id: 'n1', status: 'AUTHORIZED' });
    expect(achada).not.toHaveProperty('searchTokens');
  });

  it('a fila de contingência sobrevive ao restart e sai quando regulariza', async () => {
    await repositorio().enqueueNfce({
      documentId: 'n1',
      tenantId: 'empresa-a',
      companyId: 'empresa-a',
      // O payload da venda traz `undefined`, que o Firestore de verdade recusa.
      payload: { consumidor: undefined, valorTotal: 15 },
      idempotencyKey: 'pos-nfce:venda-1:contingency',
      queuedAt: '2026-09-14T10:00:00.000Z',
    });

    const depois = repositorio();
    const [item] = await depois.listQueuedNfce('empresa-a');
    expect(item?.payload).toEqual({ valorTotal: 15 });
    expect(Object.keys(item?.payload ?? {})).not.toContain('consumidor');
    expect(await depois.listQueuedNfce('empresa-b')).toEqual([]);

    await depois.dequeueNfce('empresa-a', 'n1');
    expect(await repositorio().findQueuedNfce('empresa-a', 'n1')).toBeUndefined();
  });
});
