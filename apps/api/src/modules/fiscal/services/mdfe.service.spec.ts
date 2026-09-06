import type { UserId } from '@synapse/types';
import { MockFiscalProvider } from '../providers/mock-fiscal.provider';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { MdfeRepository } from '../repositories/mdfe.repository';
import type { FiscalProviderRegistry } from './fiscal-provider.registry';
import { MdfeService } from './mdfe.service';

const tenant = {
  tenantId: 'tenant',
  userId: 'user' as UserId,
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};
const input = {
  companyId: 'company',
  referenceId: 'trip-1',
  idempotencyKey: 'mdfe-trip-1',
  vehicleId: '',
  driverId: '',
  nfeAccessKeys: ['1'.repeat(44)],
  loadingState: 'GO',
  unloadingState: 'SP',
  routeStates: ['MG'],
  cargoValueCents: 100_000,
  cargoWeightKg: 500,
};

describe('MdfeService', () => {
  it('cadastra frota, autoriza, alerta e encerra o MDF-e', async () => {
    const fiscal = new FiscalRepository();
    fiscal.saveConfig({
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
    const service = new MdfeService(new MdfeRepository(), fiscal, {
      resolve: () => provider,
    } as unknown as FiscalProviderRegistry);
    const driver = service.registerDriver(tenant, {
      name: 'João da Silva',
      cpf: '12345678901',
      licenseNumber: 'CNH123',
    });
    const vehicle = service.registerVehicle(tenant, {
      plate: 'ABC1D23',
      renavam: '12345678901',
      capacityKg: 1_000,
      rntrc: '123',
    });
    const manifest = await service.issue(tenant, {
      ...input,
      driverId: driver.id,
      vehicleId: vehicle.id,
    });
    expect(manifest).toMatchObject({ status: 'OPEN', loadingState: 'GO', unloadingState: 'SP' });
    expect((await service.damdfe(tenant, manifest.document.id)).length).toBeGreaterThan(0);
    await expect(
      service.close(tenant, manifest.document.id, {
        justification: 'Viagem concluída normalmente',
        cityCode: '5208707',
      }),
    ).resolves.toMatchObject({ status: 'CLOSED' });
  });

  it('recusa carga acima da capacidade do veículo', async () => {
    const fiscal = new FiscalRepository();
    fiscal.saveConfig({
      companyId: 'company',
      environment: 'MOCK',
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
    const service = new MdfeService(new MdfeRepository(), fiscal, {
      resolve: () => new MockFiscalProvider(),
    } as unknown as FiscalProviderRegistry);
    const driver = service.registerDriver(tenant, {
      name: 'João da Silva',
      cpf: '12345678901',
      licenseNumber: 'CNH123',
    });
    const vehicle = service.registerVehicle(tenant, {
      plate: 'ABC1D23',
      renavam: '12345678901',
      capacityKg: 100,
      rntrc: null,
    });
    await expect(
      service.issue(tenant, { ...input, driverId: driver.id, vehicleId: vehicle.id }),
    ).rejects.toThrow(/capacidade/);
  });
});
