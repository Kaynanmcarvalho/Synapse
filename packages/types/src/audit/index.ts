export type AuditedDomain =
  | 'PRICE'
  | 'INVENTORY'
  | 'PERMISSION'
  | 'FISCAL'
  | 'FINANCE'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'PRODUCT'
  | 'BRANCH'
  | 'CONFIG';
export interface AuditLog {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly ip: string;
  readonly device: string;
  readonly operation: string;
  readonly domain: AuditedDomain;
  readonly entity: string;
  readonly entityId: string | null;
  readonly before: Readonly<Record<string, unknown>> | null;
  readonly after: Readonly<Record<string, unknown>> | null;
  readonly occurredAt: string;
  readonly correlationId: string | null;
}
