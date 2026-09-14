import type { FiscalProviderRegistry } from '../../fiscal/services/fiscal-provider.registry';
import { MockFiscalProvider } from '../../fiscal/providers/mock-fiscal.provider';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import { NfceService } from '../../fiscal/services/nfce.service';
import {
  CONTEXTO_DO_CAIXA as contexto,
  montarPdv,
  produtoDeTeste,
  vendedorDeTeste,
} from '../../../../test/pdv-de-teste';

describe('Venda PDV NFC-e -> NFC-e autorizada -> caixa', () => {
  it('autoriza a NFC-e pelo serviço fiscal de verdade, grava a venda e fecha o caixa', async () => {
    const pdv = montarPdv();
    const fiscalRepository = new FiscalRepository(pdv.db);
    await fiscalRepository.saveConfig({
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
    const nfce = new NfceService(fiscalRepository, {
      resolve: () => new MockFiscalProvider(),
    } as unknown as FiscalProviderRegistry);
    await pdv.produtos.save(produtoDeTeste('product', 150));
    pdv.fake.semear('tenants/tenant/funcionarios/func-15', vendedorDeTeste() as never);
    const caixa = await pdv.caixas.openCash(contexto, 'matriz', 2_000);

    const venda = await pdv.vendas.concluir(
      contexto,
      caixa.id,
      {
        modo: 'NFCE',
        companyId: 'tenant',
        funcionarioId: 'func-15',
        items: [{ productId: 'product', quantity: 1_000, discount: 0, surcharge: 0 }],
        payments: [{ formaCodigo: 1, amount: 15_000 }],
      },
      nfce,
    );

    expect(venda.payments).toEqual([expect.objectContaining({ method: 'CASH', amount: 15_000 })]);
    expect(await fiscalRepository.findDocument('tenant', venda.nfceDocumentId ?? '')).toMatchObject(
      { kind: 'NFCE', status: 'AUTHORIZED', companyId: 'tenant' },
    );
    expect(await pdv.caixas.closeCash(contexto, caixa.id, 17_000)).toMatchObject({ difference: 0 });
  });
});
