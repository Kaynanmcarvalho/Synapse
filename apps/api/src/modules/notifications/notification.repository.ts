import { Injectable } from '@nestjs/common';
import type {
  NotificationEvent,
  NotificationPreference,
  NotificationRecord,
} from './notification.types';
import { cursorPage } from '../../common/pagination/cursor-page';

@Injectable()
export class NotificationRepository {
  private readonly records = new Map<string, NotificationRecord>();
  private readonly preferences = new Map<string, NotificationPreference>();
  private readonly devices = new Map<string, Map<string, 'web' | 'android'>>();
  save(record: NotificationRecord) {
    this.records.set(record.id, record);
    return record;
  }
  find(id: string) {
    return this.records.get(id);
  }
  private listAll(tenantId: string, userId: string) {
    return [...this.records.values()]
      .filter((n) => n.tenantId === tenantId && n.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  list(tenantId: string, userId: string, limit: number, cursor?: string) {
    return cursorPage(this.listAll(tenantId, userId), limit, cursor);
  }
  findRecent(
    tenantId: string,
    userId: string,
    event: NotificationEvent,
    entityKey: string,
    since: number,
  ) {
    return this.listAll(tenantId, userId).find(
      (n) => n.event === event && n.entityKey === entityKey && Date.parse(n.updatedAt) >= since,
    );
  }
  savePreference(value: NotificationPreference) {
    this.preferences.set(`${value.tenantId}:${value.userId}:${value.event}`, value);
    return value;
  }
  preference(tenantId: string, userId: string, event: NotificationEvent) {
    return this.preferences.get(`${tenantId}:${userId}:${event}`);
  }
  registerDevice(tenantId: string, userId: string, token: string, platform: 'web' | 'android') {
    const key = `${tenantId}:${userId}`;
    const devices = this.devices.get(key) ?? new Map();
    devices.set(token, platform);
    this.devices.set(key, devices);
    return { token, platform };
  }
  tokens(tenantId: string, userId: string) {
    return [...(this.devices.get(`${tenantId}:${userId}`)?.keys() ?? [])];
  }
}
