export interface Totals {
  revenueCentavos: number;
  sales: number;
  averageTicketCentavos: number;
  commissionCentavos: number;
  customers: number;
}

export interface Dashboard {
  ready: boolean;
  message?: string;
  calculatedAt: string;
  sales: Totals | null;
  monthlyGoalCentavos: number | null;
  branches: Array<
    Totals & {
      branchId: string;
      receivableCentavos?: number;
      payableCentavos?: number;
      overdueCentavos?: number;
    }
  >;
  stock: Array<{ branchId: string; available: number; outOfStock: number }>;
}
