import { Injectable } from '@nestjs/common';
import type { Titulo } from '@synapse/types';
import type { Conferencia, DeParaDoFornecedor } from '../entities/conferencia';
import type { NotaRecebida } from '../entities/nfe-xml';
import type { PosicaoDeCusto } from '../entities/custo-medio';

export interface EntradaDfe {
  readonly tenantId: string;
  readonly nota: NotaRecebida;
  readonly conferencia: Conferencia;
  readonly manifestacao: string | null;
  readonly importedAt: string;
}

@Injectable()
export class DfeRepository {
  private readonly entries = new Map<string, EntradaDfe>();
  private readonly mappings = new Map<string, DeParaDoFornecedor>();
  private readonly costs = new Map<string, PosicaoDeCusto>();
  private readonly payables = new Map<string, readonly Titulo[]>();
  private readonly nsu = new Map<string, string>();

  save(entry: EntradaDfe) {
    this.entries.set(this.key(entry.tenantId, entry.nota.chaveDeAcesso), entry);
    return entry;
  }
  find(tenantId: string, accessKey: string) {
    return this.entries.get(this.key(tenantId, accessKey));
  }
  list(tenantId: string) {
    return [...this.entries.values()].filter((entry) => entry.tenantId === tenantId);
  }
  saveMapping(mapping: DeParaDoFornecedor) {
    this.mappings.set(`${mapping.cnpjEmitente}:${mapping.codigoDoFornecedor}`, mapping);
    return mapping;
  }
  listMappings(cnpj: string) {
    return [...this.mappings.values()].filter((mapping) => mapping.cnpjEmitente === cnpj);
  }
  cost(tenantId: string, branchId: string, warehouseId: string, productId: string) {
    return (
      this.costs.get(`${tenantId}:${branchId}:${warehouseId}:${productId}`) ?? {
        quantidadeMilesimos: 0,
        custoMedioCentavos: 0,
        ultimoCustoCentavos: 0,
      }
    );
  }
  saveCost(
    tenantId: string,
    branchId: string,
    warehouseId: string,
    productId: string,
    position: PosicaoDeCusto,
  ) {
    this.costs.set(`${tenantId}:${branchId}:${warehouseId}:${productId}`, position);
    return position;
  }
  savePayables(tenantId: string, accessKey: string, titles: readonly Titulo[]) {
    this.payables.set(this.key(tenantId, accessKey), titles);
    return titles;
  }
  findPayables(tenantId: string, accessKey: string) {
    return this.payables.get(this.key(tenantId, accessKey)) ?? [];
  }
  lastNsu(tenantId: string, companyId: string) {
    return this.nsu.get(`${tenantId}:${companyId}`);
  }
  saveLastNsu(tenantId: string, companyId: string, nsu: string) {
    this.nsu.set(`${tenantId}:${companyId}`, nsu);
  }
  private key(tenantId: string, accessKey: string) {
    return `${tenantId}:${accessKey}`;
  }
}
