export const NOTIFICATION_EVENTS = [
  'BILL_OVERDUE',
  'BILL_PAID',
  'LOW_STOCK',
  'FISCAL_REJECTED',
  'ORDER_APPROVED',
  'TRANSFER_RECEIVED',
  'PRODUCT_EXPIRING',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationChannel = 'inApp' | 'push' | 'email';
export interface NotificationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly event: NotificationEvent;
  readonly title: string;
  readonly body: string;
  readonly entityKey: string;
  readonly count: number;
  readonly readAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface NotificationPreference {
  readonly tenantId: string;
  readonly userId: string;
  readonly event: NotificationEvent;
  readonly inApp: boolean;
  readonly push: boolean;
  readonly email: boolean;
}
