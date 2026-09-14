import { ForbiddenException } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { MockFiscalProvider } from '../providers/mock-fiscal.provider';
import { FiscalProviderRegistry } from './fiscal-provider.registry';
import { NfeService } from './nfe.service';

describe('NfeService', () => {
  it('gera número no backend, autoriza e mantém idempotência', async () => {
    const repository = new FiscalRepository(new FakeFirestore() as unknown as Firestore);
    await repository.saveConfig({
      companyId: 'tenant',
      environment: 'HOMOLOGACAO',
      provider: 'MOCK',
      crt: 1,
      stateRegistration: '123',
      cscId: null,
      cscSecretRef: null,
      nfeSeries: 1,
      nfceSeries: 1,
      state: 'GO',
      taxRegime: 'SIMPLES',
      certificateSecretRef: null,
      certificatePasswordSecretRef: null,
      providerApiKeySecretRef: null,
      providerTenantIdSecretRef: null,
    });
    const provider = new MockFiscalProvider();
    const service = new NfeService(repository, {
      resolve: () => provider,
    } as unknown as FiscalProviderRegistry);
    const input = {
      companyId: 'tenant',
      referenceId: 'sale-1',
      idempotencyKey: 'issue-sale-1',
      payload: { naturezaOperacao: 'VENDA' },
    };
    const first = await service.issue('tenant', input);
    const repeated = await service.issue('tenant', input);
    expect(first.status).toBe('AUTHORIZED');
    expect(first.number).toBe(1);
    expect(repeated.id).toBe(first.id);
    expect((await service.consult('tenant', first.id)).protocol).toBeTruthy();
    expect(await service.xml('tenant', first.id)).toContain('nfeProc');
    expect((await service.danfe('tenant', first.id)).length).toBeGreaterThan(0);
    await expect(
      service.correct('tenant', first.id, {
        justification: 'Correção sem alteração de valor fiscal',
        idempotencyKey: 'correction-sale-1',
      }),
    ).resolves.toMatchObject({ id: first.id, status: 'AUTHORIZED' });
    await expect(
      service.cancel('tenant', first.id, {
        justification: 'Operação cancelada por solicitação do cliente',
        idempotencyKey: 'cancel-sale-1',
      }),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(
      service.invalidate('tenant', {
        companyId: 'tenant',
        series: 1,
        firstNumber: 20,
        lastNumber: 22,
        justification: 'Falha de sistema durante a emissão da sequência',
      }),
    ).resolves.toMatchObject({ status: 'AUTHORIZED' });
    const second = await service.issue('tenant', {
      ...input,
      referenceId: 'sale-2',
      idempotencyKey: 'issue-sale-2',
    });
    expect(second.number).toBe(2);
  });
  it('recusa emitir ou inutilizar com a empresa de outro tenant', async () => {
    const db = new FakeFirestore();
    const repository = new FiscalRepository(db as unknown as Firestore);
    const service = new NfeService(repository, {
      resolve: () => new MockFiscalProvider(),
    } as unknown as FiscalProviderRegistry);

    await expect(
      service.issue('tenant', {
        companyId: 'outro-tenant',
        referenceId: 'sale-1',
        idempotencyKey: 'issue-sale-1',
        payload: { naturezaOperacao: 'VENDA' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.invalidate('tenant', {
        companyId: 'outro-tenant',
        series: 1,
        firstNumber: 20,
        lastNumber: 22,
        justification: 'Falha de sistema durante a emissão da sequência',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // Recusa antes de ler a config ou reservar número do outro tenant.
    expect(db.caminhosTocados).toEqual([]);
  });
});
