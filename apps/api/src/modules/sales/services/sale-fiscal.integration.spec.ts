import { CashSessionRepository } from '../repositories/cash-session.repository';
import { PosService } from './pos.service';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import { MockFiscalProvider } from '../../fiscal/providers/mock-fiscal.provider';
import type { FiscalProviderRegistry } from '../../fiscal/services/fiscal-provider.registry';
import { NfceService } from '../../fiscal/services/nfce.service';
import { PricingService } from '../../catalog/services/pricing.service';
import { PricingRepository } from '../../catalog/repositories/pricing.repository';
import { ProductRepository } from '../../catalog/repositories/product.repository';
import type { Product } from '@synapse/types';

const context = {
  tenantId: 'tenant',
  userId: 'operator',
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: [],
};

describe('Venda -> NFC-e -> recebimento', () => {
  it('autoriza a NFC-e, persiste o pagamento e atualiza o caixa', async () => {
    const fiscalRepository = new FiscalRepository();
    fiscalRepository.saveConfig({
      companyId: 'company',
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
    const cashRepository = new CashSessionRepository();
    const products = new ProductRepository();
    products.save({ id: 'product', tenantId: 'tenant', pricing: { salePrice: 150 } } as Product);
    // salePrice e em reais: o PricingService converte para centavos (x100).
    const pricing = new PricingService(new PricingRepository(), products);
    pricing.setSellerDiscountLimit(context, context.userId, 1_000);
    const pos = new PosService(cashRepository, pricing);
    const cash = pos.openCash(context, 'branch', 2_000);

    const sale = await pos.completeSale(
      cash.id,
      {
        companyId: 'company',
        sellerId: 'seller',
        items: [
          {
            productId: 'product',
            description: 'Produto integrado',
            quantity: 1_000,
            unitPrice: 15_000,
            discount: 0,
            surcharge: 0,
          },
        ],
        payments: [{ method: 'CASH', amount: 15_000 }],
      },
      nfce,
      context,
    );

    expect(sale.payments).toEqual([expect.objectContaining({ method: 'CASH', amount: 15_000 })]);
    expect(fiscalRepository.findDocument(sale.nfceDocumentId)).toMatchObject({
      kind: 'NFCE',
      status: 'AUTHORIZED',
      companyId: 'company',
    });
    expect(pos.closeCash(cash.id, 17_000)).toMatchObject({ difference: 0 });
  });
});
