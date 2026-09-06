import { BadRequestException, Injectable } from '@nestjs/common';
import type { ExpiryAlertLevel, ExpiringLot, Lot, LotReservation } from '@synapse/types';
import type { CreateLotInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { LotRepository } from '../repositories/lot.repository';

const ALERT_THRESHOLDS: ReadonlyArray<{ days: number; level: ExpiryAlertLevel }> = [
  { days: 15, level: 'D15' },
  { days: 30, level: 'D30' },
  { days: 60, level: 'D60' },
  { days: 90, level: 'D90' },
];

const daysUntil = (isoDate: string, now: Date): number =>
  Math.ceil((new Date(`${isoDate}T00:00:00Z`).getTime() - now.getTime()) / 86_400_000);

/** O nivel mais apertado que a validade ja alcancou — um lote a 10 dias do
 *  vencimento cai em D15, nao em D30 nem D60 (§46: 90, 60, 30, 15 dias antes).
 *  `null` quando a validade esta fora de qualquer janela de alerta. */
export const classifyExpiry = (daysRemaining: number): ExpiryAlertLevel | null => {
  if (daysRemaining < 0) return 'EXPIRED';
  return ALERT_THRESHOLDS.find((threshold) => daysRemaining <= threshold.days)?.level ?? null;
};

export interface LotBalance {
  readonly productId: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly physical: number;
  readonly reserved: number;
  readonly available: number;
  readonly lots: readonly Lot[];
}

@Injectable()
export class LotService {
  constructor(private readonly repository: LotRepository) {}

  registerLot(tenant: TenantContext, input: CreateLotInput): Promise<Lot> {
    const lot: Lot = {
      id: randomUUID(),
      tenantId: tenant.tenantId as Lot['tenantId'],
      branchId: input.branchId as Lot['branchId'],
      warehouseId: input.warehouseId,
      productId: input.productId as Lot['productId'],
      supplierId: input.supplierId,
      manufacturedAt: input.manufacturedAt,
      expiresAt: input.expiresAt,
      initialQuantity: input.quantity,
      physical: input.quantity,
      reserved: 0,
      createdAt: new Date().toISOString(),
      createdBy: tenant.userId,
    };
    return this.repository.create(tenant.tenantId, lot);
  }

  /** Saldo por lote dentro do deposito (c12-1) — a soma bate com
   *  `StockBalance` do mesmo produto/deposito quando os dois sao mantidos
   *  em sincronia pelo chamador (fora do escopo deste servico). */
  async balance(
    tenant: TenantContext,
    branchId: string,
    warehouseId: string,
    productId: string,
  ): Promise<LotBalance> {
    const lots = await this.repository.listAvailable(
      tenant.tenantId,
      branchId,
      warehouseId,
      productId,
    );
    const physical = lots.reduce((sum, lot) => sum + lot.physical, 0);
    const reserved = lots.reduce((sum, lot) => sum + lot.reserved, 0);
    return {
      productId,
      branchId,
      warehouseId,
      physical,
      reserved,
      available: physical - reserved,
      lots,
    };
  }

  /** Sugestao/reserva FEFO (c12-2): quem chama (PDV, separacao de pedido) so
   *  precisa da quantidade — este metodo decide de quais lotes ela sai. Um
   *  lote vencido nunca aparece aqui: `listAvailable` nao filtra por data,
   *  mas o vencido so entraria se ninguem tivesse rodado o alerta — a
   *  garantia dura mesmo e `assertNotExpired`, chamada antes de qualquer
   *  baixa efetiva (c12-4). */
  reserveFefo(
    tenant: TenantContext,
    branchId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
  ): Promise<LotReservation[]> {
    return this.repository.reserveFefo(tenant.tenantId, branchId, warehouseId, productId, quantity);
  }

  async assertNotExpired(tenant: TenantContext, lotId: string): Promise<Lot> {
    const lot = await this.repository.findById(tenant.tenantId, lotId);
    if (!lot) throw new BadRequestException('Lote não encontrado');
    if (daysUntil(lot.expiresAt, new Date()) < 0) {
      throw new BadRequestException(`Lote ${lot.id} está vencido e não pode ser vendido`);
    }
    return lot;
  }

  consume(tenant: TenantContext, lotId: string, quantity: number): Promise<Lot> {
    return this.repository.applyDelta(tenant.tenantId, lotId, -quantity, -quantity);
  }

  releaseReservation(tenant: TenantContext, lotId: string, quantity: number): Promise<Lot> {
    return this.repository.applyDelta(tenant.tenantId, lotId, 0, -quantity);
  }

  /** Alertas em 90/60/30/15 dias e vencidos (c12-3) — a mesma lista alimenta
   *  o dashboard de produtos proximos do vencimento (c12-5). */
  async expiryAlerts(tenant: TenantContext, limit = 50, cursor?: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 90 * 86_400_000).toISOString().slice(0, 10);
    const page = await this.repository.listExpiring(tenant.tenantId, cutoff, limit, cursor);
    const alerts: ExpiringLot[] = [];
    for (const lot of page.items) {
      if (lot.physical <= 0) continue;
      const daysUntilExpiry = daysUntil(lot.expiresAt, now);
      const alertLevel = classifyExpiry(daysUntilExpiry);
      if (alertLevel) alerts.push({ lot, daysUntilExpiry, alertLevel });
    }
    return { ...page, items: alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry) };
  }
}
