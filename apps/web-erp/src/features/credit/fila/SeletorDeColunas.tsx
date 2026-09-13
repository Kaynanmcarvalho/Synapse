import { Check, Columns3, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { COLUNAS, TODAS_AS_COLUNAS, type IdDaColuna } from './colunas';

/** Quais colunas o usuario quer ver. A escolha fica guardada com ele, entao
 *  cada um monta a fila do jeito que trabalha. */
export function SeletorDeColunas({
  ordem,
  aoAlternar,
  aoRestaurar,
}: {
  readonly ordem: readonly IdDaColuna[];
  readonly aoAlternar: (coluna: IdDaColuna) => void;
  readonly aoRestaurar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
      >
        <Columns3 size={14} aria-hidden="true" /> Colunas
        <span className="text-stone tabular-nums">{ordem.length}</span>
      </button>

      {aberto && (
        <div
          role="menu"
          className="border-hairline-light bg-canvas-light absolute right-0 z-20 mt-2 w-64 rounded-2xl border p-2 shadow-lg"
        >
          <ul className="max-h-72 overflow-y-auto">
            {TODAS_AS_COLUNAS.map((id) => {
              const marcada = ordem.includes(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={marcada}
                    onClick={() => aoAlternar(id)}
                    className="text-body-sm text-body hover:bg-surface-soft flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        marcada
                          ? 'bg-canvas-dark border-canvas-dark text-white'
                          : 'border-hairline-strong'
                      }`}
                    >
                      {marcada && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                    </span>
                    {COLUNAS[id].rotulo}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              aoRestaurar();
              setAberto(false);
            }}
            className="text-button-sm text-charcoal hover:bg-surface-soft mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 transition"
          >
            <RotateCcw size={14} aria-hidden="true" /> Voltar ao padrão
          </button>
        </div>
      )}
    </div>
  );
}
