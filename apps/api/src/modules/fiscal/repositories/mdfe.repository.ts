import { Injectable } from '@nestjs/common';
import type { FiscalDocument } from '@synapse/types';

export interface Driver {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly cpf: string;
  readonly licenseNumber: string;
}
export interface Vehicle {
  readonly id: string;
  readonly tenantId: string;
  readonly plate: string;
  readonly renavam: string;
  readonly capacityKg: number;
  readonly rntrc: string | null;
}
export interface Manifest {
  readonly document: FiscalDocument;
  readonly driverId: string;
  readonly vehicleId: string;
  readonly nfeAccessKeys: readonly string[];
  readonly loadingState: string;
  readonly unloadingState: string;
  readonly routeStates: readonly string[];
  readonly status: 'PROCESSING' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'REJECTED';
  readonly createdAt: string;
  readonly closedAt: string | null;
}

@Injectable()
export class MdfeRepository {
  private readonly drivers = new Map<string, Driver>();
  private readonly vehicles = new Map<string, Vehicle>();
  private readonly manifests = new Map<string, Manifest>();
  saveDriver(value: Driver) {
    this.drivers.set(value.id, value);
    return value;
  }
  saveVehicle(value: Vehicle) {
    this.vehicles.set(value.id, value);
    return value;
  }
  driver(tenantId: string, id: string) {
    const value = this.drivers.get(id);
    return value?.tenantId === tenantId ? value : undefined;
  }
  vehicle(tenantId: string, id: string) {
    const value = this.vehicles.get(id);
    return value?.tenantId === tenantId ? value : undefined;
  }
  saveManifest(value: Manifest) {
    this.manifests.set(value.document.id, value);
    return value;
  }
  manifest(tenantId: string, id: string) {
    const value = this.manifests.get(id);
    return value?.document.tenantId === tenantId ? value : undefined;
  }
  listOpen(tenantId: string) {
    return [...this.manifests.values()].filter(
      (value) => value.document.tenantId === tenantId && value.status === 'OPEN',
    );
  }
}
