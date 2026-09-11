import { apiRequest } from '../../lib/dev-auth';

export { devSignIn, isSignedIn } from '../../lib/dev-auth';

export interface Seller {
  readonly id: string;
  readonly name: string;
  readonly branchId: string;
  readonly region: string;
  readonly route: string | null;
  readonly commissionPercent: number;
  readonly monthlyGoalCentavos: number;
  readonly active: boolean;
}

export interface SellerDashboard {
  readonly salesTodayCentavos: number;
  readonly salesThisMonthCentavos: number;
  readonly commissionThisMonthCentavos: number;
  readonly monthlyGoalCentavos: number;
  readonly goalProgressPercent: number;
  readonly customersServedThisMonth: number;
  readonly pendingOrders: number;
}

export const getMyProfile = (): Promise<Seller> => apiRequest('/field-sales/me/profile');

export const getMyDashboard = (): Promise<SellerDashboard> =>
  apiRequest('/field-sales/me/dashboard');
