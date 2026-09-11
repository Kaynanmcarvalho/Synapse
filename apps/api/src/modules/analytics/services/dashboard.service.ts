import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Firestore } from '@synapse/firebase/admin';
import { createHash } from 'node:crypto';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import type { TenantContext } from '../../iam/iam.types';
import { RoleService } from '../../iam/services/role.service';
import { OrderRepository } from '../../sales/repositories/order.repository';
import { SellerRepository } from '../../field-sales/repositories/seller.repository';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import { contaNoSaldo, saldoCentavos } from '../../finance/entities/titulo';
import { StockIntelligenceRepository } from '../repositories/stock-intelligence.repository';
import { salesBuckets, summarizeSales, type SalesBucket } from './dashboard-calculator';

export interface DashboardQuery {
  from: string;
  to: string;
  branchId?: string;
  sellerId?: string;
  profile: 'admin' | 'stock' | 'seller';
}
interface BranchSnapshot {
  branchId: string;
  available: number;
  outOfStock: number;
  receivableCentavos: number;
  payableCentavos: number;
  overdueCentavos: number;
}
interface Snapshot {
  calculatedAt: string;
  branches: BranchSnapshot[];
  goals: Array<{ sellerId: string; branchId: string; monthlyGoalCentavos: number }>;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly cache = new Map<string, { expires: number; result: unknown }>();
  private running = false;
  constructor(
    @Inject(FIREBASE_FIRESTORE) private readonly db: Firestore,
    private readonly orders: OrderRepository,
    private readonly sellers: SellerRepository,
    private readonly titulos: TituloRepository,
    private readonly stock: StockIntelligenceRepository,
    private readonly roles: RoleService,
  ) {}

  @Cron('0 */5 * * * *')
  async recalculateAll() {
    if (this.running) return;
    this.running = true;
    try {
      for (const tenantId of await this.stock.listTenantIds()) {
        try {
          await this.recalculate(tenantId);
        } catch (error) {
          this.logger.error(
            `Falha ao recalcular dashboard ${tenantId}: ${(error as Error).message}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  async recalculate(tenantId: string) {
    const [sellers, balances, titulos] = await Promise.all([
      this.sellers.listByTenant(tenantId),
      this.stock.listAllBalances(tenantId),
      this.titulos.listAll(tenantId),
    ]);
    const rows = salesBuckets(this.orders.listByTenant(tenantId), sellers);
    const branches = new Map<string, BranchSnapshot>();
    const branch = (id: string) => {
      let value = branches.get(id);
      if (!value) {
        value = {
          branchId: id,
          available: 0,
          outOfStock: 0,
          receivableCentavos: 0,
          payableCentavos: 0,
          overdueCentavos: 0,
        };
        branches.set(id, value);
      }
      return value;
    };
    for (const balance of balances) {
      const b = branch(balance.branchId);
      b.available += balance.available;
      if (balance.available <= 0) b.outOfStock += 1;
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const titulo of titulos.filter(contaNoSaldo)) {
      const b = branch(titulo.branchId);
      if (titulo.tipo === 'RECEBER') {
        b.receivableCentavos += saldoCentavos(titulo);
        if (titulo.vencimento < today) b.overdueCentavos += saldoCentavos(titulo);
      } else b.payableCentavos += saldoCentavos(titulo);
    }
    // Uma geração nova fica invisível até todos os buckets serem gravados.
    const generation = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    const collection = this.db.collection(
      `tenants/${tenantId}/dashboardGenerations/${generation}/days`,
    );
    for (let offset = 0; offset < rows.length; offset += 400) {
      const batch = this.db.batch();
      for (const row of rows.slice(offset, offset + 400)) {
        const id = createHash('sha256')
          .update(JSON.stringify([row.date, row.branchId, row.sellerId]))
          .digest('hex');
        batch.set(collection.doc(id), row);
      }
      await batch.commit();
    }
    await this.db.doc(`tenants/${tenantId}/dashboard/status`).set({
      generation,
      calculatedAt: new Date().toISOString(),
      branches: [...branches.values()],
      goals: sellers.map((seller) => ({
        sellerId: seller.userId,
        branchId: seller.branchId,
        monthlyGoalCentavos: seller.monthlyGoalCentavos,
      })),
    });
    this.cache.clear();
    return { rows: rows.length };
  }

  async get(context: TenantContext, query: DashboardQuery) {
    const permission =
      query.profile === 'admin'
        ? 'financeiro.visualizar'
        : query.profile === 'stock'
          ? 'estoque.visualizar'
          : 'venda.criar';
    if (!this.roles.hasPermission(context, permission, { branchId: query.branchId }))
      throw new ForbiddenException('Perfil de dashboard não permitido');
    if (query.branchId && context.branchIds.length && !context.branchIds.includes(query.branchId))
      throw new ForbiddenException('Filial não permitida');
    const sellerId = query.profile === 'seller' ? context.userId : query.sellerId;
    const key = JSON.stringify([
      context.tenantId,
      context.userId,
      context.branchIds,
      this.roles.resolveGrants(context),
      query,
      sellerId,
    ]);
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.result;
    const doc = await this.db.doc(`tenants/${context.tenantId}/dashboard/status`).get();
    if (!doc.exists)
      return {
        ready: false,
        message: 'Indicadores aguardando o próximo cálculo automático (até 5 minutos).',
      };
    const snapshot = doc.data() as Snapshot & { generation: string };
    let request = this.db
      .collection(`tenants/${context.tenantId}/dashboardGenerations/${snapshot.generation}/days`)
      .where('date', '>=', query.from)
      .where('date', '<=', query.to)
      .limit(5001);
    if (query.branchId) request = request.where('branchId', '==', query.branchId);
    if (sellerId) request = request.where('sellerId', '==', sellerId);
    const documents = await request.get();
    if (documents.size > 5000)
      throw new BadRequestException('Selecione uma filial ou um período menor');
    const branchAllowed = (id: string) =>
      this.roles.hasPermission(context, permission, { branchId: id }) &&
      (!context.branchIds.length || context.branchIds.includes(id)) &&
      (!query.branchId || query.branchId === id);
    const rows = documents.docs
      .map((d) => d.data() as SalesBucket)
      .filter((row) => branchAllowed(row.branchId));
    const branchIds = [
      ...new Set([
        ...rows.map((r) => r.branchId),
        ...snapshot.branches.filter((b) => branchAllowed(b.branchId)).map((b) => b.branchId),
      ]),
    ];
    const branches = branchIds.map((branchId) => ({
      branchId,
      ...summarizeSales(rows.filter((r) => r.branchId === branchId)),
      ...(query.profile === 'admin' ? snapshot.branches.find((b) => b.branchId === branchId) : {}),
    }));
    const result = {
      ready: true,
      calculatedAt: snapshot.calculatedAt,
      profile: query.profile,
      sales: query.profile === 'stock' ? null : summarizeSales(rows),
      branches: query.profile === 'admin' ? branches : [],
      stock:
        query.profile === 'seller'
          ? []
          : snapshot.branches
              .filter((b) => branchAllowed(b.branchId))
              .map(({ branchId, available, outOfStock }) => ({ branchId, available, outOfStock })),
      monthlyGoalCentavos:
        query.profile === 'seller'
          ? (snapshot.goals.find((g) => g.sellerId === context.userId)?.monthlyGoalCentavos ?? 0)
          : null,
    };
    if (this.cache.size >= 1000) this.cache.clear();
    this.cache.set(key, { expires: Date.now() + 30_000, result });
    return result;
  }
}
