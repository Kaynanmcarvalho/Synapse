import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly taxId: string;
  readonly phone: string;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly financialStatus: 'REGULAR' | 'OVERDUE' | 'BLOCKED';
  readonly creditLimit: number;
  readonly openCredit: number;
}

export const listMyCustomers = (): Promise<Customer[]> => apiRequest('/field-sales/me/customers');
