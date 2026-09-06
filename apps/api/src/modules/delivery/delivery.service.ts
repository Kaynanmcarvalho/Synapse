import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../iam/iam.types';
import { InventoryService } from '../inventory/services/inventory.service';
import type {
  AssignmentInput,
  CreateRouteInput,
  FailureInput,
  PickingInput,
  ProofInput,
} from './dto/delivery.schemas';
import { DeliveryRepository, type DeliveryRoute, type DeliveryStatus } from './delivery.repository';
@Injectable()
export class DeliveryService {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly inventory: InventoryService,
  ) {}
  create(tenant: TenantContext, input: CreateRouteInput) {
    if (input.ownFleet && !input.mdfeId)
      throw new BadRequestException('Rota de frota própria exige MDF-e');
    return this.repository.save({
      id: randomUUID(),
      tenantId: tenant.tenantId,
      name: input.name,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      driverId: null,
      vehicleId: null,
      mdfeId: input.mdfeId ?? null,
      createdAt: new Date().toISOString(),
      deliveries: input.deliveries.map((value) => ({
        id: randomUUID(),
        ...value,
        status: 'AGUARDANDO',
        failureReason: null,
        disposition: null,
        proof: null,
      })),
    });
  }
  list(tenant: TenantContext) {
    return this.repository.list(tenant.tenantId);
  }
  assign(tenant: TenantContext, id: string, input: AssignmentInput) {
    return this.update(tenant, id, (route) => ({ ...route, ...input }));
  }
  startPicking(tenant: TenantContext, id: string, deliveryId: string) {
    return this.updateDelivery(tenant, id, deliveryId, (delivery) => {
      this.assertStatus(delivery.status, 'AGUARDANDO');
      return { ...delivery, status: 'SEPARANDO' };
    });
  }
  pick(tenant: TenantContext, id: string, deliveryId: string, input: PickingInput) {
    return this.updateDelivery(tenant, id, deliveryId, (delivery) => {
      this.assertStatus(delivery.status, 'SEPARANDO');
      const products = delivery.items.map((item) => item.productId);
      if (!products.every((product) => input.checkedProductIds.includes(product)))
        throw new BadRequestException('Conferência de separação incompleta');
      return { ...delivery, status: 'PRONTO' };
    });
  }
  dispatch(tenant: TenantContext, id: string) {
    return this.update(tenant, id, (route) => {
      if (!route.driverId || !route.vehicleId)
        throw new BadRequestException('Motorista e veículo são obrigatórios');
      if (route.deliveries.some((item) => item.status !== 'PRONTO'))
        throw new BadRequestException('Todas as entregas precisam estar prontas');
      return {
        ...route,
        deliveries: route.deliveries.map((item) => ({ ...item, status: 'EM_ROTA' })),
      };
    });
  }
  deliver(tenant: TenantContext, id: string, deliveryId: string, input: ProofInput) {
    if (!input.signatureUrl && !input.photoUrl)
      throw new BadRequestException('Assinatura ou foto obrigatória');
    return this.updateDelivery(tenant, id, deliveryId, (delivery) => {
      this.assertStatus(delivery.status, 'EM_ROTA');
      return {
        ...delivery,
        status: 'ENTREGUE',
        proof: {
          signatureUrl: input.signatureUrl ?? null,
          photoUrl: input.photoUrl ?? null,
          receivedAt: new Date().toISOString(),
        },
      };
    });
  }
  async fail(tenant: TenantContext, id: string, deliveryId: string, input: FailureInput) {
    const route = this.get(tenant, id);
    const delivery = route.deliveries.find((item) => item.id === deliveryId);
    if (!delivery) throw new NotFoundException('Entrega não encontrada');
    this.assertStatus(delivery.status, 'EM_ROTA');
    if (input.disposition === 'RETURN_STOCK') {
      for (const item of delivery.items)
        await this.inventory.move(
          tenant,
          {
            branchId: route.branchId,
            warehouseId: route.warehouseId,
            productId: item.productId,
            quantity: item.quantity,
            sourceId: delivery.orderId,
            destinationId: null,
            document: null,
            reason: `Retorno de entrega: ${input.reason}`,
            idempotencyKey: `delivery-return:${delivery.id}:${item.productId}`,
            allowNegative: false,
          },
          'RETURN',
          item.quantity,
        );
    }
    return this.updateDelivery(tenant, id, deliveryId, (current) => ({
      ...current,
      status: 'NAO_ENTREGUE',
      failureReason: input.reason,
      disposition: input.disposition,
    }));
  }
  private updateDelivery(
    tenant: TenantContext,
    id: string,
    deliveryId: string,
    mutate: (value: DeliveryRoute['deliveries'][number]) => DeliveryRoute['deliveries'][number],
  ) {
    return this.update(tenant, id, (route) => {
      if (!route.deliveries.some((item) => item.id === deliveryId))
        throw new NotFoundException('Entrega não encontrada');
      return {
        ...route,
        deliveries: route.deliveries.map((item) => (item.id === deliveryId ? mutate(item) : item)),
      };
    });
  }
  private update(
    tenant: TenantContext,
    id: string,
    mutate: (value: DeliveryRoute) => DeliveryRoute,
  ) {
    return this.repository.save(mutate(this.get(tenant, id)));
  }
  private get(tenant: TenantContext, id: string) {
    const route = this.repository.find(tenant.tenantId, id);
    if (!route) throw new NotFoundException('Rota não encontrada');
    return route;
  }
  private assertStatus(actual: DeliveryStatus, expected: DeliveryStatus) {
    if (actual !== expected) throw new BadRequestException(`Entrega precisa estar em ${expected}`);
  }
}
