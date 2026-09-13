import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/dev-auth';

export type FeatureKey =
  | 'NFE'
  | 'NFCE'
  | 'MDFE'
  | 'DFE'
  | 'FINANCE'
  | 'INVENTORY'
  | 'SELLERS'
  | 'BANKS'
  | 'SELLER_APP'
  | 'REPORTS';
type Experience = {
  flags: Record<FeatureKey, boolean>;
  branding: {
    systemName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    theme: 'light' | 'dark' | 'system';
  };
};
const defaults: Experience = {
  flags: Object.fromEntries(
    [
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
    ].map((key) => [key, true]),
  ) as Experience['flags'],
  branding: {
    systemName: 'Synapse',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#2563eb',
    secondaryColor: '#4f46e5',
    theme: 'system',
  },
};

export function useTenantExperience() {
  const [experience, setExperience] = useState(defaults);
  useEffect(() => {
    void apiRequest<Experience>('/saas/experience')
      .then((value) => {
        setExperience(value);
        document.title = value.branding.systemName;
        document.documentElement.style.setProperty('--brand-primary', value.branding.primaryColor);
        document.documentElement.style.setProperty(
          '--brand-secondary',
          value.branding.secondaryColor,
        );
        // O tema da marca nao escurece a retaguarda: o design system e so claro.
        if (value.branding.faviconUrl) {
          const existing = document.querySelector("link[rel='icon']");
          const icon = (existing ??
            document.head.appendChild(document.createElement('link'))) as HTMLLinkElement;
          icon.rel = 'icon';
          icon.href = value.branding.faviconUrl;
        }
      })
      .catch(() => undefined);
  }, []);
  return experience;
}
