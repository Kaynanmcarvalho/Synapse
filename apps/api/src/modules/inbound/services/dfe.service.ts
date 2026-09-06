import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { FiscalProvider, FiscalProviderResult, Titulo, UserId } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { InventoryService } from '../../inventory/services/inventory.service';
import { LotService } from '../../inventory/services/lot.service';
import { FiscalRepository } from '../../fiscal/repositories/fiscal.repository';
import { FiscalProviderRegistry } from '../../fiscal/services/fiscal-provider.registry';
import type {
  CheckDfeItemInput,
  ImportDfeXmlInput,
  LaunchDfeInput,
  ManifestDfeInput,
  PollDfeInput,
  SupplierMappingInput,
} from '../dto/dfe.schemas';
import {
  concluirConferencia,
  lancarNoEstoque,
  marcarItemConferido,
  prepararConferencia,
  validarManifestacao,
} from '../entities/conferencia';
import { aplicarEntrada, parcelasDaNota } from '../entities/custo-medio';
import { lerNotaDoXml } from '../entities/nfe-xml';
import { DfeRepository } from '../repositories/dfe.repository';

type DfeProvider = FiscalProvider & {
  manifestDFe?: (payload: Record<string, unknown>) => Promise<FiscalProviderResult>;
};

@Injectable()
export class DfeService {
  constructor(
    private readonly repository: DfeRepository,
    private readonly fiscalRepository: FiscalRepository,
    private readonly providers: FiscalProviderRegistry,
    private readonly inventory: InventoryService,
    private readonly lots: LotService,
  ) {}

  async poll(tenant: TenantContext, input: PollDfeInput) {
    const provider = this.provider(input.companyId);
    const lastNsu =
      input.lastNsu ?? this.repository.lastNsu(tenant.tenantId, input.companyId) ?? '0';
    const documents = await provider.queryDFe({
      tipoConsulta: 'ultimo_nsu',
      cnpj: input.cnpj,
      ultimoNsu: lastNsu,
    });
    const imported = [];
    let greatestNsu = BigInt(lastNsu);
    for (const document of documents) {
      const nsu = this.text(document.raw['nsu']);
      if (/^\d+$/.test(nsu) && BigInt(nsu) > greatestNsu) greatestNsu = BigInt(nsu);
      const xml = this.xmlFrom(document.raw);
      if (xml) imported.push(this.importXml(tenant, { xml }));
    }
    this.repository.saveLastNsu(tenant.tenantId, input.companyId, greatestNsu.toString());
    return { lastNsu: greatestNsu.toString(), found: documents.length, imported };
  }

  importXml(tenant: TenantContext, input: ImportDfeXmlInput) {
    const note = lerNotaDoXml(input.xml);
    const existing = this.repository.find(tenant.tenantId, note.chaveDeAcesso);
    if (existing) return existing;
    return this.repository.save({
      tenantId: tenant.tenantId,
      nota: note,
      conferencia: prepararConferencia(note, this.repository.listMappings(note.emitente.cnpj)),
      manifestacao: null,
      importedAt: new Date().toISOString(),
    });
  }

  list(tenant: TenantContext) {
    return this.repository.list(tenant.tenantId);
  }

  get(tenant: TenantContext, accessKey: string) {
    const entry = this.repository.find(tenant.tenantId, accessKey);
    if (!entry) throw new NotFoundException('DF-e não encontrado');
    return { ...entry, payables: this.repository.findPayables(tenant.tenantId, accessKey) };
  }

  saveMapping(tenant: TenantContext, input: SupplierMappingInput) {
    const mapping = this.repository.saveMapping(input);
    for (const entry of this.repository.list(tenant.tenantId)) {
      if (
        entry.nota.emitente.cnpj !== input.cnpjEmitente ||
        entry.conferencia.situacao !== 'PENDENTE'
      )
        continue;
      this.repository.save({
        ...entry,
        conferencia: prepararConferencia(
          entry.nota,
          this.repository.listMappings(input.cnpjEmitente),
        ),
      });
    }
    return mapping;
  }

  checkItem(
    tenant: TenantContext,
    accessKey: string,
    itemNumber: number,
    input: CheckDfeItemInput,
  ) {
    const entry = this.entry(tenant, accessKey);
    return this.repository.save({
      ...entry,
      conferencia: marcarItemConferido(entry.conferencia, itemNumber, {
        ...input,
        lote: input.lote ?? null,
        validade: input.validade ?? null,
      }),
    });
  }

  conclude(tenant: TenantContext, accessKey: string) {
    const entry = this.entry(tenant, accessKey);
    return this.repository.save({
      ...entry,
      conferencia: concluirConferencia(
        entry.conferencia,
        tenant.userId as UserId,
        new Date().toISOString(),
      ),
    });
  }

  async manifest(tenant: TenantContext, accessKey: string, input: ManifestDfeInput) {
    const entry = this.entry(tenant, accessKey);
    const request = {
      chaveDeAcesso: accessKey,
      manifestacao: input.manifestacao,
      justificativa: input.justificativa ?? null,
      por: tenant.userId as UserId,
    };
    validarManifestacao(request);
    const provider = this.provider(input.companyId);
    if (!provider.manifestDFe)
      throw new BadRequestException('Provedor fiscal não suporta manifestação de DF-e');
    await provider.manifestDFe({
      chave: accessKey,
      tipo: input.manifestacao,
      justificativa: input.justificativa ?? undefined,
    });
    return this.repository.save({ ...entry, manifestacao: input.manifestacao });
  }

  async launch(tenant: TenantContext, accessKey: string, input: LaunchDfeInput) {
    const entry = this.entry(tenant, accessKey);
    if (entry.conferencia.situacao === 'LANCADA') return this.get(tenant, accessKey);
    if (entry.conferencia.situacao !== 'CONFERIDA')
      throw new BadRequestException('A entrada só acontece após a conferência humana');

    await this.launchItems(tenant, accessKey, input, entry);
    const payables = this.createPayables(tenant, input, entry);
    this.repository.savePayables(tenant.tenantId, accessKey, payables);
    this.repository.save({ ...entry, conferencia: lancarNoEstoque(entry.conferencia) });
    return this.get(tenant, accessKey);
  }

  private async launchItems(
    tenant: TenantContext,
    accessKey: string,
    input: LaunchDfeInput,
    entry: ReturnType<DfeService['entry']>,
  ) {
    for (const item of entry.conferencia.itens) {
      if (!item.productId) throw new BadRequestException(`Item ${item.numero} sem produto interno`);
      await this.inventory.move(
        tenant,
        {
          branchId: input.branchId,
          warehouseId: input.warehouseId,
          productId: item.productId,
          quantity: item.quantidadeMilesimos,
          sourceId: accessKey,
          destinationId: null,
          document: entry.nota.numero,
          reason: `Entrada por XML da NF-e ${entry.nota.numero}`,
          idempotencyKey: `dfe:${accessKey}:item:${item.numero}`,
          allowNegative: false,
        },
        'INBOUND',
        item.quantidadeMilesimos,
      );
      const current = this.repository.cost(
        tenant.tenantId,
        input.branchId,
        input.warehouseId,
        item.productId,
      );
      this.repository.saveCost(
        tenant.tenantId,
        input.branchId,
        input.warehouseId,
        item.productId,
        aplicarEntrada(current, item.quantidadeMilesimos, item.custoUnitarioCentavos),
      );
      if (item.lote && item.validade) {
        await this.lots.registerLot(tenant, {
          branchId: input.branchId,
          warehouseId: input.warehouseId,
          productId: item.productId,
          supplierId: input.supplierId,
          manufacturedAt: entry.nota.emissao.slice(0, 10),
          expiresAt: item.validade,
          quantity: item.quantidadeMilesimos,
        });
      }
    }
  }

  private createPayables(
    tenant: TenantContext,
    input: LaunchDfeInput,
    entry: ReturnType<DfeService['entry']>,
  ): readonly Titulo[] {
    const installments = parcelasDaNota(
      entry.nota.duplicatas.map((duplicate) => ({
        vencimento: duplicate.vencimento,
        valorCentavos: duplicate.valorCentavos,
      })),
      entry.nota.valorTotalCentavos,
      input.defaultDueDate,
    );
    return installments.map((installment): Titulo => ({
      id: randomUUID(),
      tenantId: tenant.tenantId as Titulo['tenantId'],
      branchId: input.branchId as Titulo['branchId'],
      tipo: 'PAGAR',
      descricao: `NF-e ${entry.nota.numero} — ${entry.nota.emitente.nome}`,
      customerId: null,
      fornecedorId: input.supplierId,
      orderId: null,
      numeroParcela: installment.numero,
      totalDeParcelas: installments.length,
      valorOriginalCentavos: installment.valorCentavos,
      vencimento: installment.vencimento,
      status: 'ABERTO',
      liquidacoes: [],
      centroDeCustoId: null,
      categoriaId: null,
      renegociadoDe: null,
      renegociadoPara: [],
      criadoEm: new Date().toISOString(),
      criadoPor: tenant.userId as UserId,
    }));
  }

  private entry(tenant: TenantContext, accessKey: string) {
    const entry = this.repository.find(tenant.tenantId, accessKey);
    if (!entry) throw new NotFoundException('DF-e não encontrado');
    return entry;
  }

  private provider(companyId: string): DfeProvider {
    const config = this.fiscalRepository.findConfig(companyId);
    if (!config) throw new NotFoundException('Configuração fiscal da empresa não encontrada');
    return this.providers.resolve(config) as DfeProvider;
  }

  private text(value: unknown) {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }

  private xmlFrom(raw: Readonly<Record<string, unknown>>): string | null {
    for (const field of ['xml', 'conteudo', 'documento']) {
      const value = this.text(raw[field]);
      if (value.trim().startsWith('<')) return value;
      if (value) {
        const decoded = Buffer.from(value, 'base64').toString('utf8');
        if (decoded.trim().startsWith('<')) return decoded;
      }
    }
    return null;
  }
}
