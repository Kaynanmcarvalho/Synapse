/* eslint-disable max-lines-per-function */
import {
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  Command,
  Gauge,
  Menu,
  Moon,
  PackageSearch,
  Plug,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
  TrendingUp,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CommandPalette } from '../features/search/CommandPalette';
import { ShortcutsModal } from '../features/search/ShortcutsModal';
import { applyTheme, getStoredTheme, type Theme } from './theme';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
  readonly badge?: string;
}

const NAVIGATION: Array<{ title: string; items: NavItem[] }> = [
  { title: 'Workspace', items: [{ label: 'Visão geral', path: '/visao-geral', icon: Gauge }] },
  {
    title: 'Operação',
    items: [
      { label: 'PDV / Caixa', path: '/vendas/pdv', icon: ScanLine, badge: 'F10' },
      { label: 'Estoque', path: '/estoque', icon: Warehouse },
      { label: 'Inventários', path: '/estoque/inventarios', icon: PackageSearch },
      {
        label: 'Inteligência de estoque',
        path: '/estoque/inteligencia',
        icon: TrendingUp,
        badge: 'F8',
      },
      { label: 'Compras', path: '/compras', icon: ShoppingCart, badge: 'F8' },
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

function SidebarContent({ closeMobile }: { readonly closeMobile?: () => void }) {
  return (
    <>
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-slate-950 text-white shadow-lg shadow-slate-950/20 dark:bg-white dark:text-slate-950">
          <Command size={21} strokeWidth={2.2} />
          <span className="absolute inset-x-1 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </span>
        <span>
          <strong className="block text-[15px] font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white">
            Synapse
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
              {group.items.map((item) => {
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
                          ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <ItemIcon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${isActive ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
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

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white">
            MA
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => setTheme(getStoredTheme()), []);

  // §59 "atalho Ctrl+K" — precisa funcionar em qualquer tela, então o
  // listener vive no AppShell (montado sempre), não dentro do palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col border-r border-slate-200/80 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[286px] flex-col bg-white shadow-2xl dark:bg-slate-900">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
            <SidebarContent closeMobile={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950/85">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="relative hidden max-w-md flex-1 text-left sm:block"
          >
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <span className="flex h-10 w-full items-center rounded-xl border border-transparent bg-slate-100/80 pl-10 pr-20 text-xs font-medium text-slate-400 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800">
              Buscar produto, pedido ou cliente...
            </span>
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Command size={9} /> K
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 sm:flex dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
            >
              <Sparkles size={15} /> Atalhos
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {theme === 'dark' ? (
                <Sun size={18} strokeWidth={1.8} />
              ) : (
                <Moon size={18} strokeWidth={1.8} />
              )}
            </button>
            {[CircleHelp, Bell, Settings].map((ActionIcon, index) => (
              <button
                key={index}
                type="button"
                aria-label={['Ajuda', 'Notificações', 'Configurações'][index]}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <ActionIcon size={18} strokeWidth={1.8} />
                {index === 1 && (
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-950" />
                )}
              </button>
            ))}
          </div>
        </header>
        <Outlet />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
