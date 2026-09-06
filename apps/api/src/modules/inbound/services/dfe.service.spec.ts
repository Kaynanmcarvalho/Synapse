import type { FiscalProvider, UserId } from '@synapse/types';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import { MockFiscalProvider } from '../../fiscal/providers/mock-fiscal.provider';
import type { FiscalProviderRegistry } from '../../fiscal/services/fiscal-provider.registry';
import type { InventoryService } from '../../inventory/services/inventory.service';
import type { LotService } from '../../inventory/services/lot.service';
import { DfeRepository } from '../repositories/dfe.repository';
import { DfeService } from './dfe.service';

const ACCESS_KEY = '52260612345678000199550010000012341234567890';
const xml = `<nfeProc><NFe><infNFe Id="NFe${ACCESS_KEY}">
  <ide><nNF>1234</nNF><serie>1</serie><dhEmi>2026-06-10T09:00:00-03:00</dhEmi></ide>
  <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Agro</xNome><enderEmit><UF>GO</UF></enderEmit></emit>
  <det nItem="1"><prod><cProd>FORN-1</cProd><xProd>Ração</xProd><cEAN>SEM GTIN</cEAN>
    <NCM>23099010</NCM><CFOP>5102</CFOP><uCom>FD</uCom><qCom>10.000</qCom>
    <vUnCom>150.00</vUnCom><vProd>1500.00</vProd>
    <rastro><nLote>L-1</nLote><dVal>2027-06-10</dVal></rastro></prod></det>
  <total><ICMSTot><vNF>1500.00</vNF></ICMSTot></total>
  <cobr><dup><nDup>001</nDup><dVenc>2026-07-10</dVenc><vDup>1500.00</vDup></dup></cobr>
</infNFe></NFe></nfeProc>`;

const tenant = {
  tenantId: 'tenant',
  userId: 'conferente' as UserId,
  roleIds: [],
  branchIds: ['branch'],
  warehouseIds: ['warehouse'],
};

function setup() {
  const repository = new DfeRepository();
  const fiscalRepository = new FiscalRepository();
  fiscalRepository.saveConfig({
    companyId: 'company',
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
  const registry = { resolve: () => provider } as unknown as FiscalProviderRegistry;
  const inventory = { move: jest.fn().mockResolvedValue({}) } as unknown as InventoryService;
  const lots = { registerLot: jest.fn().mockResolvedValue({}) } as unknown as LotService;
  return {
    repository,
    provider,
    inventory,
    lots,
    service: new DfeService(repository, fiscalRepository, registry, inventory, lots),
  };
}

describe('DfeService', () => {
  it('só lança estoque, lote, custo e contas a pagar depois da conferência humana', async () => {
    const { service, repository, inventory, lots } = setup();
    service.importXml(tenant, { xml });
    await expect(
      service.launch(tenant, ACCESS_KEY, {
        branchId: 'branch',
        warehouseId: 'warehouse',
        supplierId: 'supplier',
        defaultDueDate: '2026-07-10',
      }),
    ).rejects.toThrow(/conferência humana/);

    service.saveMapping(tenant, {
      cnpjEmitente: '12345678000199',
      codigoDoFornecedor: 'FORN-1',
      productId: 'product-1',
      fatorDeConversao: 1,
    });
    service.checkItem(tenant, ACCESS_KEY, 1, {
      productId: 'product-1',
      quantidadeMilesimos: 10_000,
      custoUnitarioCentavos: 15_000,
      lote: 'L-1',
      validade: '2027-06-10',
    });
    service.conclude(tenant, ACCESS_KEY);
    const launched = await service.launch(tenant, ACCESS_KEY, {
      branchId: 'branch',
      warehouseId: 'warehouse',
      supplierId: 'supplier',
      defaultDueDate: '2026-07-10',
    });

    expect(inventory.move).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({ productId: 'product-1', quantity: 10_000 }),
      'INBOUND',
      10_000,
    );
    expect(lots.registerLot).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({ productId: 'product-1', expiresAt: '2027-06-10' }),
    );
    expect(repository.cost('tenant', 'branch', 'warehouse', 'product-1')).toMatchObject({
      quantidadeMilesimos: 10_000,
      custoMedioCentavos: 15_000,
    });
    expect(launched.conferencia.situacao).toBe('LANCADA');
    expect(launched.payables).toHaveLength(1);
    expect(launched.payables[0]).toMatchObject({ tipo: 'PAGAR', valorOriginalCentavos: 150_000 });
  });

  it('registra as quatro manifestações e valida justificativas negativas', async () => {
    const { service } = setup();
    service.importXml(tenant, { xml });
    await expect(
      service.manifest(tenant, ACCESS_KEY, {
        companyId: 'company',
        manifestacao: 'OPERACAO_NAO_REALIZADA',
        justificativa: 'curta',
      }),
    ).rejects.toThrow(/15 caracteres/);
    await expect(
      service.manifest(tenant, ACCESS_KEY, {
        companyId: 'company',
        manifestacao: 'CIENCIA_DA_OPERACAO',
        justificativa: null,
      }),
    ).resolves.toMatchObject({ manifestacao: 'CIENCIA_DA_OPERACAO' });
  });

  it('consulta periodicamente a partir do último NSU e importa XML completo', async () => {
    const { service, provider } = setup();
    jest.spyOn(provider as FiscalProvider, 'queryDFe').mockResolvedValue([
      {
        status: 'AUTHORIZED',
        providerId: 'document-1',
        jobId: null,
        accessKey: ACCESS_KEY,
        protocol: null,
        xml,
        code: '138',
        message: 'Documento localizado',
        raw: { nsu: '42', xml },
      },
    ]);

    await expect(
      service.poll(tenant, { companyId: 'company', cnpj: '12345678000199' }),
    ).resolves.toMatchObject({ lastNsu: '42', found: 1 });
    await expect(
      service.poll(tenant, { companyId: 'company', cnpj: '12345678000199' }),
    ).resolves.toMatchObject({ lastNsu: '42' });
    expect(provider.queryDFe).toHaveBeenLastCalledWith(
      expect.objectContaining({ ultimoNsu: '42' }),
    );
  });
});
