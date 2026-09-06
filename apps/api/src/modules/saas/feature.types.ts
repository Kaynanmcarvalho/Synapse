export const FEATURE_KEYS = [
  'NFE',
  'NFCE',
  'MDFE',
  'DFE',
  'FINANCE',
  'INVENTORY',
  'SELLERS',
  'BANKS',
  'SELLER_APP',
  'REPORTS',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureFlags = Record<FeatureKey, boolean>;

export interface TenantBranding {
  readonly systemName: string;
  readonly legalName: string;
  readonly logoUrl: string | null;
  readonly faviconUrl: string | null;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly theme: 'light' | 'dark' | 'system';
}
export interface TenantExperience {
  readonly tenantId: string;
  readonly flags: FeatureFlags;
  readonly branding: TenantBranding;
}
