import { Search } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ColunaDaTabela {
  readonly rotulo: string;
  readonly alinhamento?: 'esquerda' | 'direita' | 'centro';
  /** Largura fixa, quando a coluna nao deve crescer (lupa, serie, dias). */
  readonly largura?: string;
}

const ALINHAR = { esquerda: 'text-left', direita: 'text-right', centro: 'text-center' } as const;

const alinhar = (coluna: ColunaDaTabela): string => ALINHAR[coluna.alinhamento ?? 'esquerda'];

/** Tabela das partes da ficha: titulo em faixa, colunas separadas por linha
 *  vertical e linhas por linha horizontal — o olho segue a coluna sem se perder,
 *  mesmo com 150 registros. */
export function Tabela({
  colunas,
  larguraMinima,
  children,
}: {
  readonly colunas: readonly ColunaDaTabela[];
  readonly larguraMinima: number;
  readonly children: ReactNode;
}) {
  return (
    <div className="border-hairline-light overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse" style={{ minWidth: larguraMinima }}>
        <thead className="bg-surface-soft sticky top-0 z-[1]">
          <tr className="divide-hairline-light border-hairline-light divide-x border-b">
            {colunas.map((coluna) => (
              <th
                key={coluna.rotulo || 'acao'}
                scope="col"
                style={coluna.largura ? { width: coluna.largura } : undefined}
                className={`text-caption text-stone whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-[0.06em] ${alinhar(coluna)}`}
              >
                {coluna.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-hairline-light text-body-sm divide-y">{children}</tbody>
      </table>
    </div>
  );
}

/** Linha da tabela da ficha: separacao vertical igual a do titulo. */
export function LinhaDaTabela({
  children,
  destaque = false,
}: {
  readonly children: ReactNode;
  readonly destaque?: boolean;
}) {
  return (
    <tr
      className={`divide-hairline-light divide-x transition-colors duration-150 ${
        destaque ? 'bg-accent-danger/[0.04]' : 'hover:bg-surface-soft'
      }`}
    >
      {children}
    </tr>
  );
}

export function Celula({
  children,
  coluna,
  forte = false,
}: {
  readonly children: ReactNode;
  readonly coluna: ColunaDaTabela;
  readonly forte?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 tabular-nums ${alinhar(coluna)} ${
        forte ? 'text-ink font-semibold' : 'text-charcoal'
      }`}
    >
      {children}
    </td>
  );
}

/** A lupa que abre o pedido por tras de uma linha. Sem pedido ligado, ela fica
 *  apagada — e o titulo avisa por que. */
export function BotaoLupa({
  rotulo,
  aoAbrir,
}: {
  readonly rotulo: string;
  readonly aoAbrir: (() => void) | null;
}) {
  return (
    <button
      type="button"
      onClick={aoAbrir ?? undefined}
      disabled={!aoAbrir}
      aria-label={rotulo}
      title={aoAbrir ? rotulo : 'Este registro não está ligado a um pedido'}
      className="text-charcoal hover:bg-canvas-light hover:text-ink hover:shadow-cartao inline-flex h-7 w-7 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
    >
      <Search size={14} aria-hidden="true" />
    </button>
  );
}
