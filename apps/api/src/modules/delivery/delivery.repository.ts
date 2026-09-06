import { Injectable } from '@nestjs/common';
import { cursorPage } from '../../common/pagination/cursor-page';
export type DeliveryStatus =
  'AGUARDANDO' | 'SEPARANDO' | 'PRONTO' | 'EM_ROTA' | 'ENTREGUE' | 'NAO_ENTREGUE';
export interface Delivery {
  readonly id: string;
  readonly orderId: string;
  readonly address: string;
  readonly items: readonly { productId: string; quantity: number }[];
  readonly status: DeliveryStatus;
  readonly failureReason: string | null;
  readonly disposition: 'RETURN_STOCK' | 'RETAIN_DRIVER' | null;
  readonly proof: {
    signatureUrl: string | null;
    photoUrl: string | null;
    receivedAt: string;
  } | null;
}
export interface DeliveryRoute {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly branchId: string;
  readonly warehouseId: string;
  readonly driverId: string | null;
  readonly vehicleId: string | null;
  readonly mdfeId: string | null;
  readonly deliveries: readonly Delivery[];
  readonly createdAt: string;
}
@Injectable()
export class DeliveryRepository {
  private readonly routes = new Map<string, DeliveryRoute>();
  save(route: DeliveryRoute) {
    this.routes.set(route.id, route);
    return route;
  }
  find(tenantId: string, id: string) {
    const route = this.routes.get(id);
    return route?.tenantId === tenantId ? route : undefined;
  }
  list(tenantId: string, limit: number, cursor?: string) {
    return cursorPage(
      [...this.routes.values()]
        .filter((route) => route.tenantId === tenantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      limit,
      cursor,
    );
  }
}
