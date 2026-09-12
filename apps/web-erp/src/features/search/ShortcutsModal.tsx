import { MENUS } from '../../app/menu/menu.data';
import { todosOsItens } from '../../app/menu/menu.utils';

const GERAIS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: 'Ctrl+K', description: 'O que você precisa? (busca global)' },
  { keys: 'F10', description: 'Ir para a barra de menus' },
  { keys: 'Alt+1', description: 'Abrir visão geral' },
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
    <section className="mt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{titulo}</h3>
      <ul className="mt-2 space-y-2">
        {itens.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-600 dark:text-slate-300">{shortcut.description}</span>
            <span className="flex shrink-0 gap-1">
              {shortcut.keys.split('+').map((key) => (
                <kbd
                  key={key}
                  className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <button
        type="button"
        aria-label="Fechar atalhos"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Atalhos de teclado</h2>
        <Lista titulo="Rotinas do menu" itens={DO_MENU} />
        <Lista titulo="Navegação" itens={GERAIS} />
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-9 w-full rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-100 dark:text-slate-900"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
