import { ForbiddenException } from '@nestjs/common';
import type { FiscalProvider, FiscalProviderResult } from '@synapse/types';
import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { MockFiscalProvider } from '../providers/mock-fiscal.provider';
import { FiscalProviderRegistry } from './fiscal-provider.registry';
import { NfceService } from './nfce.service';

const sale = {
  id: 'sale-1',
  cashSessionId: 'cash-1',
  customerId: null,
  customerTaxId: '12345678901',
  sellerId: 'seller-1',
  items: [
    {
      productId: 'product-1' as never,
      barcode: '7891234567890',
      description: 'Produto',
      quantity: 1_000,
      unitPrice: 1_500,
      discount: 0,
      surcharge: 0,
      total: 1_500,
    },
  ],
  payments: [{ method: 'PIX' as const, amount: 1_500, reference: null }],
  subtotal: 1_500,
  discount: 0,
  surcharge: 0,
  total: 1_500,
  completedAt: new Date().toISOString(),
};

async function configuredRepository() {
  const repository = new FiscalRepository(new FakeFirestore() as unknown as Firestore);
  await repository.saveConfig({
    companyId: 'tenant',
    environment: 'HOMOLOGACAO',
    provider: 'MOCK',
    crt: 1,
    stateRegistration: '123',
    cscId: '1',
    cscSecretRef: 'secret',
    nfeSeries: 1,
    nfceSeries: 1,
    nfceContingencyEnabled: true,
    nfceCancellationWindowMinutes: 30,
    state: 'GO',
    taxRegime: 'SIMPLES',
    certificateSecretRef: null,
    certificatePasswordSecretRef: null,
    providerApiKeySecretRef: null,
    providerTenantIdSecretRef: null,
  });
  return repository;
}

describe('NfceService', () => {
  it('emite a NFC-e no fechamento do PDV com idempotência e cancelamento', async () => {
    const repository = await configuredRepository();
    const provider = new MockFiscalProvider();
    const service = new NfceService(repository, {
      resolve: () => provider,
    } as unknown as FiscalProviderRegistry);

    const id = await service.issueNfce('tenant', 'tenant', sale);
    expect(await service.issueNfce('tenant', 'tenant', sale)).toBe(id);
    expect(await service.consult('tenant', id)).toMatchObject({
      kind: 'NFCE',
      status: 'AUTHORIZED',
    });
    expect((await service.print('tenant', id)).danfe.length).toBeGreaterThan(0);
    await expect(
      service.cancel('tenant', id, {
        justification: 'Cancelamento solicitado pelo consumidor',
        idempotencyKey: 'cancel-nfce-sale-1',
      }),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it('entra em contingência e regulariza pela fila sem bloquear a venda', async () => {
    const repository = await configuredRepository();
    const mock = new MockFiscalProvider();
    let calls = 0;
    const provider = {
      ...mock,
      issueNFCe: async () => {
        calls += 1;
        if (calls === 1) throw new Error('SEFAZ indisponível');
        return {
          status: 'PROCESSING',
          providerId: 'nfce-provider-1',
          jobId: 'job-1',
          accessKey: null,
          protocol: null,
          xml: '<NFe><infNFeSupl><qrCode><![CDATA[https://sefaz/qrcode?p=1&x=2]]></qrCode></infNFeSupl></NFe>',
          code: null,
          message: 'Contingência pendente',
        } satisfies FiscalProviderResult;
      },
      checkNFCeJob: async () =>
        ({
          status: 'AUTHORIZED',
          providerId: 'nfce-provider-1',
          jobId: 'job-1',
          accessKey: '1'.repeat(44),
          protocol: '123',
          xml: '<NFe><infNFeSupl><qrCode><![CDATA[https://sefaz/qrcode?p=1&x=2]]></qrCode></infNFeSupl></NFe>',
          code: '100',
          message: 'Autorizada',
        }) satisfies FiscalProviderResult,
      getNFCeDanfe: async () => new Uint8Array([1]),
    } as unknown as FiscalProvider;
    const service = new NfceService(repository, {
      resolve: () => provider,
    } as unknown as FiscalProviderRegistry);

    const id = await service.issueNfce('tenant', 'tenant', sale);
    expect((await repository.findDocument('tenant', id))?.status).toBe('CONTINGENCY');
    expect(await repository.listQueuedNfce('tenant')).toHaveLength(1);
    await expect(service.consult('tenant', id)).resolves.toMatchObject({ status: 'AUTHORIZED' });
    expect(await repository.listQueuedNfce('tenant')).toHaveLength(0);
    expect((await service.print('tenant', id)).qrCodeUrl).toBe('https://sefaz/qrcode?p=1&x=2');
  });
  it('recusa emitir a NFC-e com a empresa de outro tenant', async () => {
    const repository = await configuredRepository();
    const service = new NfceService(repository, {
      resolve: () => new MockFiscalProvider(),
    } as unknown as FiscalProviderRegistry);

    await expect(service.issueNfce('outro-tenant', 'tenant', sale)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(await repository.listByTenant('outro-tenant')).toEqual([]);
  });
});
