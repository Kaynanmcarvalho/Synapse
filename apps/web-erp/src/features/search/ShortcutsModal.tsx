import { MENUS } from '../../app/menu/menu.data';
import { todosOsItens } from '../../app/menu/menu.utils';

const GERAIS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: 'Ctrl+K', description: 'O que você precisa? (busca global)' },
  { keys: 'F10', description: 'Ir para a barra de menus' },
  { keys: 'Alt+1', description: 'Abrir o início' },
  { keys: 'Alt+2', description: 'Abrir PDV' },
  { keys: 'Alt+3', description: 'Abrir estoque' },
  { keys: 'Alt+4', description: 'Abrir compras' },
  { keys: 'Alt+5', description: 'Abrir boletos' },
  { keys: 'Esc', description: 'Fechar menu, busca ou painel aberto' },
];

/** Os atalhos das rotinas vem do proprio menu: um atalho novo la aparece aqui. */
const DO_MENU = todosOsItens(MENUS).flatMap((item) =>
  item.atalho ? [{ keys: item.atalho.rotulo, description: item.trilha.join(' › ') }] : [],
);

function Lista({
  titulo,
  itens,
}: {
  readonly titulo: string;
  readonly itens: ReadonlyArray<{ keys: string; description: string }>;
}) {
  return (
    <section className="mt-6">
      <h3 className="text-caption text-stone font-semibold uppercase tracking-[0.08em]">
        {titulo}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {itens.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-center justify-between gap-4">
            <span className="text-body-sm text-charcoal">{shortcut.description}</span>
            <span className="flex shrink-0 gap-1">
              {shortcut.keys.split('+').map((key) => (
                <kbd
                  key={key}
                  className="border-hairline-light bg-surface-soft text-charcoal rounded-lg border px-2 py-0.5 font-sans text-[12px] font-semibold"
                >
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ShortcutsModal({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="bg-canvas-dark/40 fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Fechar atalhos"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Atalhos de teclado"
        className="border-hairline-light bg-canvas-light relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-6 shadow-xl"
      >
        <h2 className="font-display text-heading-sm text-ink">Atalhos de teclado</h2>
        <Lista titulo="Rotinas do menu" itens={DO_MENU} />
        <Lista titulo="Navegação" itens={GERAIS} />
        <button
          type="button"
          onClick={onClose}
          className="bg-canvas-dark text-button-md hover:bg-charcoal mt-8 h-12 w-full rounded-full text-white transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
