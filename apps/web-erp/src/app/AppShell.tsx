/* eslint-disable max-lines-per-function */
import { CircleHelp, Command, Menu, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTenantExperience } from './useTenantExperience';
import { NotificationCenter } from '../features/notifications/NotificationCenter';
import { CommandPalette } from '../features/search/CommandPalette';
import { ShortcutsModal } from '../features/search/ShortcutsModal';
import { devSignOut } from '../lib/dev-auth';
import { applyTheme, getStoredTheme, type Theme } from './theme';
import { MENUS } from './menu/menu.data';
import { filtrarPorFeature } from './menu/menu.utils';
import { MenuBar } from './menu/MenuBar';
import { MobileMenu } from './menu/MobileMenu';
import { useMenuShortcuts } from './menu/useMenuShortcuts';
import { ROTAS } from './rotas';

const BOTAO_DE_ICONE =
  'flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

function Marca({
  systemName,
  logoUrl,
}: {
  readonly systemName: string;
  readonly logoUrl: string | null;
}) {
  return (
    <Link to={ROTAS.visaoGeral} className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] bg-slate-950 text-white shadow-md shadow-slate-950/20 dark:bg-white dark:text-slate-950">
        {logoUrl ? (
          <img alt="" className="h-full w-full object-cover" src={logoUrl} />
        ) : (
          <Command size={17} strokeWidth={2.2} />
        )}
      </span>
      <strong className="text-[15px] font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white">
        {systemName}
      </strong>
    </Link>
  );
}

/** Casca da retaguarda. A navegacao segue a barra de menus do Syndata — mesmos
 *  menus, mesmas opcoes, mesma ordem — para quem migra achar tudo onde ja
 *  procurava; o visual e o do Synapse. */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const location = useLocation();
  const navigate = useNavigate();
  const experience = useTenantExperience();

  // Opcao de modulo desligado para o tenant nao aparece — nem no menu, nem no atalho.
  const menus = useMemo(
    () => filtrarPorFeature(MENUS, (feature) => !feature || experience.flags[feature]),
    [experience.flags],
  );
  useMenuShortcuts(menus);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  // §59 "atalho Ctrl+K" — precisa funcionar em qualquer tela, então o
  // listener vive no AppShell (montado sempre), não dentro do palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setShortcutsOpen(false);
        setMobileOpen(false);
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const paths: Record<string, string> = {
          '1': ROTAS.visaoGeral,
          '2': ROTAS.pdv,
          '3': ROTAS.estoque,
          '4': ROTAS.compras,
          '5': ROTAS.boletos,
        };
        const path = paths[event.key];
        if (path) {
          event.preventDefault();
          navigate(path);
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  const sair = async () => {
    try {
      await devSignOut();
    } finally {
      // Recarrega de proposito: as telas guardam o estado de login em memoria.
      window.location.assign(ROTAS.visaoGeral);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className={`${BOTAO_DE_ICONE} lg:hidden`}
          >
            <Menu size={19} />
          </button>
          <Marca
            systemName={experience.branding.systemName}
            logoUrl={experience.branding.logoUrl}
          />

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="relative mx-auto hidden w-full max-w-lg text-left sm:block"
          >
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <span className="flex h-9 w-full items-center rounded-xl border border-transparent bg-slate-100/80 pl-10 pr-16 text-[13px] text-slate-400 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800">
              O que você precisa?
            </span>
            <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Command size={9} /> K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Abrir busca global"
              className={`${BOTAO_DE_ICONE} sm:hidden`}
            >
              <Search size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 md:flex dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
            >
              <Sparkles size={15} /> Atalhos
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className={BOTAO_DE_ICONE}
            >
              {theme === 'dark' ? (
                <Sun size={18} strokeWidth={1.8} />
              ) : (
                <Moon size={18} strokeWidth={1.8} />
              )}
            </button>
            <NotificationCenter />
            <button type="button" aria-label="Ajuda" className={`${BOTAO_DE_ICONE} hidden sm:flex`}>
              <CircleHelp size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Os paineis do menu abrem num portal: rolar esta faixa em tela estreita nao os corta. */}
        <div className="hidden h-11 items-center overflow-x-auto border-t border-slate-100 px-4 [scrollbar-width:none] lg:flex lg:px-6 dark:border-slate-800/80">
          <MenuBar menus={menus} onSair={() => void sair()} />
        </div>
      </header>

      {mobileOpen && (
        <MobileMenu
          menus={menus}
          onFechar={() => setMobileOpen(false)}
          onSair={() => void sair()}
        />
      )}

      <Outlet />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
