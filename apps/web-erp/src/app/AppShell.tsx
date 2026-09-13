/* eslint-disable max-lines-per-function */
import { CircleHelp, Menu, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NotificationCenter } from '../features/notifications/NotificationCenter';
import { CommandPalette } from '../features/search/CommandPalette';
import { ShortcutsModal } from '../features/search/ShortcutsModal';
import { useAuth, useUsuario } from './auth/AuthContext';
import { MENUS } from './menu/menu.data';
import { filtrarPorFeature } from './menu/menu.utils';
import { MenuBar } from './menu/MenuBar';
import { MobileMenu } from './menu/MobileMenu';
import { useMenuShortcuts } from './menu/useMenuShortcuts';
import { ROTAS } from './rotas';
import { LimiteDeFalha } from './shell/LimiteDeFalha';
import { Marca } from './shell/Marca';
import { ShellContext } from './shell/ShellContext';
import { useTenantExperience } from './useTenantExperience';

const BOTAO_DE_ICONE =
  'flex h-10 w-10 items-center justify-center rounded-full text-charcoal transition hover:bg-surface-soft hover:text-ink';

const iniciais = (nome: string): string =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('') || '?';

function Usuario() {
  const usuario = useUsuario();
  return (
    <span className="ml-1 flex items-center gap-2.5" title={usuario.email}>
      <span
        aria-hidden="true"
        className="bg-ink flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-white"
      >
        {iniciais(usuario.nome)}
      </span>
      <span className="text-body-sm text-ink hidden max-w-[160px] truncate font-semibold xl:block">
        {usuario.nome}
      </span>
    </span>
  );
}

/** Casca da retaguarda. A navegacao segue a barra de menus do Syndata — mesmos
 *  menus, mesmas opcoes, mesma ordem — e o visual segue o design system do
 *  Synapse, em modo claro. So existe atras do login (RequireAuth). */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const experience = useTenantExperience();
  const { sair } = useAuth();

  // Opcao de modulo desligado para o tenant nao aparece — nem no menu, nem no atalho.
  const menus = useMemo(
    () => filtrarPorFeature(MENUS, (feature) => !feature || experience.flags[feature]),
    [experience.flags],
  );
  useMenuShortcuts(menus);
  const casca = useMemo(() => ({ abrirBusca: () => setPaletteOpen(true), menus }), [menus]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

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
          '1': ROTAS.inicio,
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

  return (
    <ShellContext.Provider value={casca}>
      <div className="bg-canvas-light text-ink min-h-screen">
        <header className="border-hairline-light bg-canvas-light/95 sticky top-0 z-30 border-b backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className={`${BOTAO_DE_ICONE} -ml-2 lg:hidden`}
            >
              <Menu size={20} />
            </button>
            <Marca
              nome={experience.branding.systemName}
              logoUrl={experience.branding.logoUrl}
              para={ROTAS.inicio}
            />

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="bg-surface-soft mx-auto hidden h-11 w-full max-w-[480px] items-center gap-3 rounded-full px-4 text-left transition hover:bg-[#ececee] sm:flex"
            >
              <Search size={17} className="text-stone" aria-hidden="true" />
              <span className="text-body-sm text-stone flex-1">O que você precisa?</span>
              <kbd className="bg-canvas-light text-ash rounded-full px-2 py-0.5 font-sans text-[11px] font-medium">
                Ctrl K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1 sm:ml-0">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Abrir busca global"
                className={`${BOTAO_DE_ICONE} sm:hidden`}
              >
                <Search size={19} />
              </button>
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                className="bg-surface-soft text-button-sm text-ink mr-1 hidden h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee] md:flex"
              >
                <Sparkles size={15} aria-hidden="true" /> Atalhos
              </button>
              <NotificationCenter />
              <button
                type="button"
                aria-label="Ajuda"
                className={`${BOTAO_DE_ICONE} hidden sm:flex`}
              >
                <CircleHelp size={19} strokeWidth={1.8} />
              </button>
              <Usuario />
            </div>
          </div>

          {/* Os paineis do menu abrem num portal: rolar esta faixa em tela estreita nao os corta. */}
          <div className="border-hairline-light hidden h-12 items-center overflow-x-auto border-t px-4 [scrollbar-width:none] lg:flex lg:px-6">
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

        <LimiteDeFalha key={location.pathname}>
          <Outlet />
        </LimiteDeFalha>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      </div>
    </ShellContext.Provider>
  );
}
