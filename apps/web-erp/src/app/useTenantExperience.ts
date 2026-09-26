import { canaisDoHex, MARCA } from '@synapse/sdl/tokens';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/dev-auth';

/** A API devolve estes dois como branding de quem nunca configurou marca. Sao
 *  placeholder, nao decisao de ninguem: aplicar o primeiro pintaria o ERP
 *  inteiro de outro azul. Enquanto o padrao da API nao for o cobalto do
 *  Synapse, eles valem como "sem marca definida". */
const SEM_MARCA_DEFINIDA = ['#2563eb', '#4f46e5'];

/** Tenant -> custom property -> token do SDL -> classes (`bg-primary`,
 *  `ring-primary/15`). Nenhuma tela precisa saber o HEX da marca, e cor invalida
 *  nao apaga a marca: `canaisDoHex` devolve nulo e o cobalto continua valendo. */
const aplicarMarcaDoTenant = (cor: string | null | undefined): void => {
  const escolhida = cor?.trim().toLowerCase();
  if (!escolhida || SEM_MARCA_DEFINIDA.includes(escolhida)) return;
  const canais = canaisDoHex(escolhida);
  if (canais) document.documentElement.style.setProperty(MARCA.variavel, canais);
};

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
    primaryColor: MARCA.padraoHex,
    secondaryColor: MARCA.padraoHex,
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
        aplicarMarcaDoTenant(value.branding.primaryColor);
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
