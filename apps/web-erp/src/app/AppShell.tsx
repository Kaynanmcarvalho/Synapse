/* eslint-disable max-lines-per-function */
import { Kbd } from '@synapse/sdl';
import { CircleHelp, Keyboard, Menu, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

/** Botao de icone da chrome: sem caixa em repouso, a affordance so aparece no
 *  hover/foco — nao e um circulo de avatar generico sempre visivel. */
const BOTAO_DE_ICONE =
  'flex h-8 w-8 items-center justify-center rounded-controle text-charcoal transition-colors duration-rapido hover:bg-surface-soft hover:text-ink';

const iniciais = (nome: string): string =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('') || '?';

/** Selo com as iniciais, nao um avatar redondo colorido: o Synapse guarda o
 *  circulo cheio para a marca (Marca.tsx), nao para o usuario. */
function Usuario() {
  const usuario = useUsuario();
  return (
    <span className="ml-1 flex items-center gap-2" title={usuario.email}>
      <span
        aria-hidden="true"
        className="border-hairline-light bg-surface-soft text-ink rounded-controle flex h-7 w-7 items-center justify-center border text-[11px] font-semibold"
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
  const botaoAjuda = useRef<HTMLButtonElement | null>(null);

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
          {/* Application Header — 48px. So a estrutura externa muda aqui: marca,
           *  busca, atalhos, notificacoes e usuario. O conteudo da Command
           *  Palette continua o mesmo. */}
          <div className="flex h-12 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className={`${BOTAO_DE_ICONE} -ml-1.5 lg:hidden`}
            >
              <Menu size={19} />
            </button>
            <Marca
              nome={experience.branding.systemName}
              logoUrl={experience.branding.logoUrl}
              para={ROTAS.inicio}
            />

            {/* Campo de busca integrado a chrome — nao e mais uma pilula de
             *  destaque: borda fina, radius de controle, largura contida. */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="border-hairline-light bg-surface-soft hover:bg-surface-hover duration-rapido rounded-controle ml-2 hidden h-8 w-full max-w-[320px] items-center gap-2 border px-2.5 text-left transition-colors sm:flex"
            >
              <Search size={15} className="text-stone shrink-0" aria-hidden="true" />
              {/* text-ash, nao text-stone: o texto do placeholder precisa ler
               *  como conteudo (AA, 4.5:1), nao so como decoracao. */}
              <span className="text-body-sm text-ash flex-1 truncate">O que você precisa?</span>
              <span className="flex shrink-0 items-center gap-0.5">
                <Kbd className="h-5 min-w-5 px-1 text-[10px]">Ctrl</Kbd>
                <Kbd className="h-5 min-w-5 px-1 text-[10px]">K</Kbd>
              </span>
            </button>

            <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
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
                aria-label="Ver atalhos de teclado"
                title="Atalhos de teclado"
                className={`${BOTAO_DE_ICONE} hidden md:flex`}
              >
                <Keyboard size={18} strokeWidth={1.8} />
              </button>
              <NotificationCenter />
              <button
                ref={botaoAjuda}
                type="button"
                aria-label="Ajuda"
                className={`${BOTAO_DE_ICONE} hidden sm:flex`}
              >
                <CircleHelp size={18} strokeWidth={1.8} />
              </button>
              <Usuario />
            </div>
          </div>

          {/* Application Menubar — 40px. Os paineis do menu abrem num portal:
           *  rolar esta faixa em tela estreita nao os corta. */}
          <div className="border-hairline-light hidden h-10 items-center overflow-x-auto border-t px-4 [scrollbar-width:none] lg:flex lg:px-6">
            <MenuBar
              menus={menus}
              caminhoAtual={location.pathname}
              onSair={() => void sair()}
              focarAntesDaBarra={() => botaoAjuda.current?.focus()}
            />
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
