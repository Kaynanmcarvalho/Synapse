import type { Order, Seller } from '@synapse/types';

export interface SalesBucket {
  date: string;
  branchId: string;
  sellerId: string;
  revenueCentavos: number;
  sales: number;
  commissionCentavos: number;
  customerIds: string[];
}

export function salesBuckets(orders: readonly Order[], sellers: readonly Seller[]): SalesBucket[] {
  const buckets = new Map<string, SalesBucket>();
  const sellerById = new Map(sellers.map((seller) => [seller.userId as string, seller]));
  for (const order of orders) {
    if (!['INVOICED', 'DELIVERED'].includes(order.status)) continue;
    const date = order.createdAt.slice(0, 10);
    const sellerId = order.createdBy.uid;
    const key = JSON.stringify([date, order.branchId, sellerId]);
    const bucket = buckets.get(key) ?? {
      date,
      branchId: order.branchId,
      sellerId,
      revenueCentavos: 0,
      sales: 0,
      commissionCentavos: 0,
      customerIds: [],
    };
    const returns = order.returnedItems.reduce((sum, returned) => {
      const item = order.items.find((line) => line.productId === returned.productId);
      return sum + (item ? Math.round((item.total * returned.quantity) / item.quantity) : 0);
    }, 0);
    const net = Math.max(0, order.total - returns);
    bucket.revenueCentavos += net;
    bucket.sales += 1;
    bucket.commissionCentavos += Math.round(
      (net * (sellerById.get(sellerId)?.commissionPercent ?? 0)) / 100,
    );
    if (!bucket.customerIds.includes(order.customerId)) bucket.customerIds.push(order.customerId);
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

export function summarizeSales(rows: readonly SalesBucket[]) {
  const revenueCentavos = rows.reduce((sum, row) => sum + row.revenueCentavos, 0);
  const sales = rows.reduce((sum, row) => sum + row.sales, 0);
  return {
    revenueCentavos,
    sales,
    averageTicketCentavos: sales ? Math.round(revenueCentavos / sales) : 0,
    commissionCentavos: rows.reduce((sum, row) => sum + row.commissionCentavos, 0),
    customers: new Set(rows.flatMap((row) => row.customerIds)).size,
  };
}
