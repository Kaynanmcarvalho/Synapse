export type BankProviderId = 'sicredi' | 'itau';

export type ReceivableStatus = 'open' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface Receivable {
  readonly id: string;
  readonly amount: number;
  readonly dueDate: string;
  readonly status: ReceivableStatus;
}
