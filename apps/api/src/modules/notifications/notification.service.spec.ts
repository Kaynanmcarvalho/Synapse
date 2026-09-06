import type { TenantContext } from '../iam/iam.types';
import type { EmailGateway, FcmGateway } from './notification.gateways';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NOTIFICATION_EVENTS } from './notification.types';

const manager: TenantContext = {
  tenantId: 'tenant',
  userId: 'manager',
  roleIds: ['GERENTE'],
  branchIds: [],
  warehouseIds: [],
};
describe('NotificationService', () => {
  it('aceita os sete eventos, respeita preferência e agrupa repetições', async () => {
    const fcm = { send: jest.fn().mockResolvedValue({ successCount: 1 }) } as unknown as FcmGateway;
    const email = { send: jest.fn().mockResolvedValue(undefined) } as unknown as EmailGateway;
    const service = new NotificationService(new NotificationRepository(), fcm, email);
    service.register(
      { ...manager, userId: 'user' },
      { token: 'token-com-tamanho-suficiente-123', platform: 'web' },
    );
    for (const event of NOTIFICATION_EVENTS) {
      await service.publish(manager, {
        userId: 'user',
        event,
        title: event,
        body: 'Evento ocorrido',
        entityKey: event,
        recipientEmail: 'user@example.com',
      });
    }
    await service.publish(manager, {
      userId: 'user',
      event: 'LOW_STOCK',
      title: 'Estoque',
      body: 'Ainda baixo',
      entityKey: 'LOW_STOCK',
    });
    const records = service.list({ ...manager, userId: 'user' });
    expect(records).toHaveLength(7);
    expect(records.find((item) => item.event === 'LOW_STOCK')?.count).toBe(2);
    expect(fcm.send).toHaveBeenCalledTimes(8);
    expect(email.send).toHaveBeenCalledTimes(2);
  });

  it('marca como lida e preserva o histórico', async () => {
    const service = new NotificationService(
      new NotificationRepository(),
      { send: jest.fn() } as unknown as FcmGateway,
      { send: jest.fn() } as unknown as EmailGateway,
    );
    const record = await service.publish(manager, {
      userId: 'manager',
      event: 'ORDER_APPROVED',
      title: 'Pedido',
      body: 'Aprovado',
      entityKey: 'order-1',
    });
    expect(service.read(manager, record.id).readAt).not.toBeNull();
    expect(service.list(manager)).toHaveLength(1);
  });

  it('desliga canais por usuário e evento', async () => {
    const fcm = { send: jest.fn() } as unknown as FcmGateway;
    const service = new NotificationService(new NotificationRepository(), fcm, {
      send: jest.fn(),
    } as unknown as EmailGateway);
    service.preference(
      { ...manager, userId: 'user' },
      { event: 'BILL_PAID', inApp: false, push: false, email: false },
    );
    await service.publish(manager, {
      userId: 'user',
      event: 'BILL_PAID',
      title: 'Pago',
      body: 'Recebido',
      entityKey: 'bill-1',
    });
    expect(service.list({ ...manager, userId: 'user' })).toHaveLength(0);
    expect(fcm.send).not.toHaveBeenCalled();
  });
});
