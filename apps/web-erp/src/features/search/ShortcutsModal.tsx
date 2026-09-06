const SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: 'Ctrl K', description: 'Abrir a busca global' },
  { keys: 'Esc', description: 'Fechar busca, modal ou painel aberto' },
  { keys: '↑ ↓', description: 'Navegar pelos resultados da busca' },
  { keys: 'Enter', description: 'Abrir o resultado selecionado' },
];

export function ShortcutsModal({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <button
        type="button"
        aria-label="Fechar atalhos"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Atalhos de teclado</h2>
        <ul className="mt-3 space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">{shortcut.description}</span>
              <span className="flex gap-1">
                {shortcut.keys.split(' ').map((key) => (
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
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-9 w-full rounded-xl bg-slate-950 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-100 dark:text-slate-900"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
