import {
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  Command,
  Gauge,
  FileInput,
  Menu,
  PackageSearch,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTenantExperience, type FeatureKey } from './useTenantExperience';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
  readonly badge?: string;
  readonly feature?: FeatureKey;
}

const NAVIGATION: Array<{ title: string; items: NavItem[] }> = [
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
    ],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Produtos', path: '/cadastros/produtos', icon: Boxes },
      { label: 'Cargos e permissões', path: '/configuracoes/cargos', icon: ShieldCheck },
    ],
  },
];

function SidebarContent({
  closeMobile,
  enabled,
  systemName,
  logoUrl,
}: {
  readonly closeMobile?: () => void;
  readonly enabled: (feature?: FeatureKey) => boolean;
  readonly systemName: string;
  readonly logoUrl: string | null;
}) {
  return (
    <>
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-slate-950 text-white shadow-lg shadow-slate-950/20">
          {logoUrl ? (
            <img alt="" className="h-full w-full object-cover" src={logoUrl} />
          ) : (
            <Command size={21} strokeWidth={2.2} />
          )}
          <span className="absolute inset-x-1 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </span>
        <span>
          <strong className="block text-[15px] font-extrabold tracking-[-0.02em] text-slate-950">
            {systemName}
          </strong>
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Business OS
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Navegação principal">
        {NAVIGATION.map((group) => (
          <div key={group.title} className="mb-7">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items
                .filter((item) => enabled(item.feature))
                .map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/estoque'}
                      onClick={closeMobile}
                      className={({ isActive }) =>
                        `group flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <ItemIcon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${isActive ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-400'}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white">
            MA
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs font-bold text-slate-800">
              Marina Alves
            </strong>
            <span className="block truncate text-[10px] text-slate-400">Administradora</span>
          </span>
          <ChevronDown size={15} className="text-slate-400" />
        </button>
      </div>
    </>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const experience = useTenantExperience();
  const enabled = (feature?: FeatureKey) => !feature || experience.flags[feature];

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-slate-200/80 bg-white lg:flex">
        <SidebarContent
          enabled={enabled}
          systemName={experience.branding.systemName}
          logoUrl={experience.branding.logoUrl}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[286px] flex-col bg-white shadow-2xl">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <SidebarContent
              closeMobile={() => setMobileOpen(false)}
              enabled={enabled}
              systemName={experience.branding.systemName}
              logoUrl={experience.branding.logoUrl}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Buscar no Synapse"
              placeholder="Buscar produto, pedido ou cliente..."
              className="h-10 w-full rounded-xl border border-transparent bg-slate-100/80 pl-10 pr-20 text-xs font-medium outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 shadow-sm">
              <Command size={9} /> K
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button className="hidden h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 sm:flex">
              <Sparkles size={15} /> Atalhos
            </button>
            {[CircleHelp, Bell, Settings].map((ActionIcon, index) => (
              <button
                key={index}
                type="button"
                aria-label={['Ajuda', 'Notificações', 'Configurações'][index]}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ActionIcon size={18} strokeWidth={1.8} />
                {index === 1 && (
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>
            ))}
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
