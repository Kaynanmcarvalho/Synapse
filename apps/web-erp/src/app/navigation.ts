import {
  Boxes,
  FileInput,
  Gauge,
  PackageSearch,
  Plug,
  ScanLine,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureKey } from './useTenantExperience';

/** Menu lateral da retaguarda. Item com `feature` so aparece quando a flag do
 *  tenant esta ligada; sem `feature`, aparece sempre. */
export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
  readonly badge?: string;
  readonly feature?: FeatureKey;
}

export const NAVIGATION: Array<{ title: string; items: NavItem[] }> = [
  { title: 'Workspace', items: [{ label: 'Visão geral', path: '/visao-geral', icon: Gauge }] },
  {
    title: 'Operação',
    items: [
      { label: 'PDV / Caixa', path: '/vendas/pdv', icon: ScanLine, badge: 'F10', feature: 'NFCE' },
      { label: 'Estoque', path: '/estoque', icon: Warehouse, feature: 'INVENTORY' },
      {
        label: 'Inventários',
        path: '/estoque/inventarios',
        icon: PackageSearch,
        feature: 'INVENTORY',
      },
      { label: 'Entrada por XML', path: '/estoque/entradas-xml', icon: FileInput, feature: 'DFE' },
      {
        label: 'Inteligência de estoque',
        path: '/estoque/inteligencia',
        icon: TrendingUp,
        badge: 'F8',
      },
      { label: 'Compras', path: '/compras', icon: ShoppingCart, badge: 'F8' },
      { label: 'Boletos', path: '/financeiro/boletos', icon: ShoppingCart },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Produtos', path: '/cadastros/produtos', icon: Boxes },
      { label: 'Configuração por filial', path: '/configuracoes/filiais', icon: Settings },
      { label: 'Cargos e permissões', path: '/configuracoes/cargos', icon: ShieldCheck },
      { label: 'Integrações', path: '/configuracoes/integracoes', icon: Plug, badge: 'F9' },
    ],
  },
];
