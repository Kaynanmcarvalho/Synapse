import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { FiscalDocument, FiscalProvider, FiscalProviderResult } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import type {
  DriverInput,
  IssueMdfeInput,
  MdfeEventInput,
  VehicleInput,
} from '../dto/mdfe.schemas';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { MdfeRepository, type Manifest } from '../repositories/mdfe.repository';
import { FiscalProviderRegistry } from './fiscal-provider.registry';

type CapableProvider = FiscalProvider & {
  closeMDFe?: (id: string, payload: Record<string, unknown>) => Promise<FiscalProviderResult>;
  cancelMDFe?: (id: string, payload: Record<string, unknown>) => Promise<FiscalProviderResult>;
  checkMDFeJob?: (id: string) => Promise<FiscalProviderResult>;
  getDamdfe?: (id: string) => Promise<Uint8Array>;
};

@Injectable()
export class MdfeService {
  constructor(
    private readonly repository: MdfeRepository,
    private readonly fiscal: FiscalRepository,
    private readonly providers: FiscalProviderRegistry,
  ) {}
  registerDriver(tenant: TenantContext, input: DriverInput) {
    return this.repository.saveDriver({ id: randomUUID(), tenantId: tenant.tenantId, ...input });
  }
  registerVehicle(tenant: TenantContext, input: VehicleInput) {
    return this.repository.saveVehicle({
      id: randomUUID(),
      tenantId: tenant.tenantId,
      ...input,
      rntrc: input.rntrc ?? null,
    });
  }
  async issue(tenant: TenantContext, input: IssueMdfeInput) {
    const existing = this.fiscal.findByIdempotency(input.idempotencyKey);
    if (existing) {
      const repeated = this.repository.manifest(tenant.tenantId, existing.id);
      if (!repeated) throw new NotFoundException('MDF-e idempotente não encontrado');
      return repeated;
    }
    const driver = this.repository.driver(tenant.tenantId, input.driverId);
    const vehicle = this.repository.vehicle(tenant.tenantId, input.vehicleId);
    if (!driver || !vehicle) throw new NotFoundException('Motorista ou veículo não encontrado');
    if (input.loadingState === input.unloadingState && input.routeStates.length > 0)
      throw new BadRequestException('Percurso interestadual inválido');
    if (input.cargoWeightKg > vehicle.capacityKg)
      throw new BadRequestException('Peso excede a capacidade do veículo');
    const { config, provider } = this.context(input.companyId);
    const document: FiscalDocument = {
      id: randomUUID(),
      tenantId: tenant.tenantId,
      companyId: input.companyId,
      kind: 'MDFE',
      environment: config.environment,
      status: 'PROCESSING',
      series: 1,
      number: Date.now(),
      accessKey: null,
      protocol: null,
      providerJobId: null,
      xml: null,
      sefazCode: null,
      sefazMessage: null,
      attempts: 0,
      idempotencyKey: input.idempotencyKey,
      issuedAt: null,
    };
    this.fiscal.saveDocument(document);
    const created: Manifest = {
      document,
      driverId: driver.id,
      vehicleId: vehicle.id,
      nfeAccessKeys: input.nfeAccessKeys,
      loadingState: input.loadingState,
      unloadingState: input.unloadingState,
      routeStates: input.routeStates,
      status: 'PROCESSING',
      createdAt: new Date().toISOString(),
      closedAt: null,
    };
    this.repository.saveManifest(created);
    const result = await provider.issueMDFe({
      companyId: input.companyId,
      referenceId: input.referenceId,
      number: document.number,
      series: 1,
      idempotencyKey: input.idempotencyKey,
      payload: {
        motorista: driver,
        veiculo: vehicle,
        chavesNFe: input.nfeAccessKeys,
        ufCarregamento: input.loadingState,
        ufDescarregamento: input.unloadingState,
        percurso: input.routeStates,
        valorCarga: input.cargoValueCents / 100,
        pesoCargaKg: input.cargoWeightKg,
      },
    });
    return this.apply(created, result);
  }
  async consult(tenant: TenantContext, id: string) {
    const manifest = this.get(tenant, id);
    const provider = this.context(manifest.document.companyId).provider;
    return manifest.document.providerJobId && provider.checkMDFeJob
      ? this.apply(manifest, await provider.checkMDFeJob(manifest.document.providerJobId))
      : manifest;
  }
  async close(tenant: TenantContext, id: string, input: MdfeEventInput) {
    const manifest = this.open(tenant, id);
    const provider = this.context(manifest.document.companyId).provider;
    if (!provider.closeMDFe) throw new BadRequestException('Provedor não suporta encerramento');
    await provider.closeMDFe(manifest.document.providerJobId ?? id, {
      codigoMunicipio: input.cityCode,
      justificativa: input.justification,
    });
    return this.repository.saveManifest({
      ...manifest,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
    });
  }
  async cancel(tenant: TenantContext, id: string, input: MdfeEventInput) {
    const manifest = this.open(tenant, id);
    const provider = this.context(manifest.document.companyId).provider;
    if (!provider.cancelMDFe) throw new BadRequestException('Provedor não suporta cancelamento');
    const result = await provider.cancelMDFe(manifest.document.providerJobId ?? id, {
      justificativa: input.justification,
    });
    return this.apply(manifest, result, 'CANCELLED');
  }
  alerts(tenant: TenantContext, hours = 24) {
    const limit = Date.now() - hours * 3_600_000;
    return this.repository
      .listOpen(tenant.tenantId)
      .filter((item) => Date.parse(item.createdAt) < limit);
  }
  async damdfe(tenant: TenantContext, id: string) {
    const manifest = this.get(tenant, id);
    const provider = this.context(manifest.document.companyId).provider;
    if (!provider.getDamdfe) throw new BadRequestException('Provedor não suporta DAMDFE');
    return provider.getDamdfe(manifest.document.providerJobId ?? id);
  }
  private get(tenant: TenantContext, id: string) {
    const value = this.repository.manifest(tenant.tenantId, id);
    if (!value) throw new NotFoundException('MDF-e não encontrado');
    return value;
  }
  private open(tenant: TenantContext, id: string) {
    const value = this.get(tenant, id);
    if (value.status !== 'OPEN') throw new BadRequestException('MDF-e não está aberto');
    return value;
  }
  private context(companyId: string) {
    const config = this.fiscal.findConfig(companyId);
    if (!config) throw new NotFoundException('Configuração fiscal não encontrada');
    return { config, provider: this.providers.resolve(config) as CapableProvider };
  }
  private apply(manifest: Manifest, result: FiscalProviderResult, forced?: Manifest['status']) {
    const fiscalStatus = forced === 'CANCELLED' ? 'CANCELLED' : result.status;
    const document = this.fiscal.saveDocument({
      ...manifest.document,
      status: fiscalStatus,
      accessKey: result.accessKey,
      protocol: result.protocol,
      providerJobId: result.jobId ?? result.providerId,
      xml: result.xml,
      sefazCode: result.code,
      sefazMessage: result.message,
      attempts: manifest.document.attempts + 1,
      issuedAt:
        fiscalStatus === 'AUTHORIZED' ? new Date().toISOString() : manifest.document.issuedAt,
    });
    return this.repository.saveManifest({
      ...manifest,
      document,
      status:
        forced ??
        (fiscalStatus === 'AUTHORIZED'
          ? 'OPEN'
          : fiscalStatus === 'REJECTED'
            ? 'REJECTED'
            : 'PROCESSING'),
    });
  }
}
