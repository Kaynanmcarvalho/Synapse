import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../iam/iam.types';
import type { DeviceInput, PreferenceInput, PublishInput } from './dto/notification.schemas';
import { EmailGateway, FcmGateway } from './notification.gateways';
import { NotificationRepository } from './notification.repository';
import type { NotificationPreference } from './notification.types';

const CRITICAL = new Set(['BILL_OVERDUE', 'FISCAL_REJECTED']);
@Injectable()
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly fcm: FcmGateway,
    private readonly email: EmailGateway,
  ) {}
  list(context: TenantContext) {
    return this.repository.list(context.tenantId, context.userId);
  }
  read(context: TenantContext, id: string) {
    const value = this.repository.find(id);
    if (!value || value.tenantId !== context.tenantId || value.userId !== context.userId)
      throw new NotFoundException('Notificação não encontrada');
    return this.repository.save({
      ...value,
      readAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  register(context: TenantContext, input: DeviceInput) {
    return this.repository.registerDevice(
      context.tenantId,
      context.userId,
      input.token,
      input.platform,
    );
  }
  preference(context: TenantContext, input: PreferenceInput) {
    return this.repository.savePreference({
      tenantId: context.tenantId,
      userId: context.userId,
      ...input,
    });
  }
  async publish(context: TenantContext, input: PublishInput) {
    if (
      !context.roleIds.some((role) =>
        ['SUPER_ADMIN_SAAS', 'ADMIN_EMPRESA', 'ADMIN_FILIAL', 'GERENTE'].includes(role),
      )
    )
      throw new ForbiddenException('Sem permissão para publicar notificações');
    const preference =
      this.repository.preference(context.tenantId, input.userId, input.event) ??
      this.defaults(context.tenantId, input.userId, input.event);
    const now = new Date().toISOString();
    const repeated = this.repository.findRecent(
      context.tenantId,
      input.userId,
      input.event,
      input.entityKey,
      Date.now() - 10 * 60_000,
    );
    const record = repeated
      ? { ...repeated, count: repeated.count + 1, body: input.body, readAt: null, updatedAt: now }
      : {
          id: randomUUID(),
          tenantId: context.tenantId,
          userId: input.userId,
          event: input.event,
          title: input.title,
          body: input.body,
          entityKey: input.entityKey,
          count: 1,
          readAt: null,
          createdAt: now,
          updatedAt: now,
        };
    if (preference.inApp) this.repository.save(record);
    if (preference.push)
      await this.fcm.send(
        this.repository.tokens(context.tenantId, input.userId),
        input.title,
        input.body,
        { event: input.event, entityKey: input.entityKey },
      );
    if (preference.email && CRITICAL.has(input.event) && input.recipientEmail)
      await this.email.send(input.recipientEmail, input.title, input.body);
    return record;
  }
  private defaults(
    tenantId: string,
    userId: string,
    event: PreferenceInput['event'],
  ): NotificationPreference {
    return { tenantId, userId, event, inApp: true, push: true, email: CRITICAL.has(event) };
  }
}
