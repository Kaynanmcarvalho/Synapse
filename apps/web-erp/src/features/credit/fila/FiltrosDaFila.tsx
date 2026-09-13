import { Eraser, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { ATALHOS, type Atalho } from './colunas';
import { temFiltro, type Filtros } from './filtros';

const CAMPO =
  'border-hairline-light text-body-sm text-ink placeholder:text-stone h-9 rounded-xl border bg-canvas-light px-3 outline-none transition focus:border-hairline-strong';

function Campo({
  rotulo,
  children,
  largura,
}: {
  readonly rotulo: string;
  readonly children: ReactNode;
  readonly largura: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${largura}`}>
      <span className="text-caption text-stone font-semibold uppercase tracking-[0.06em]">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

/** A barra de busca da fila, com os mesmos campos do sistema antigo: numero do
 *  pedido, cliente, vendedor e periodo — mais a busca livre e os atalhos. */
export function FiltrosDaFila({
  filtros,
  aoMudar,
  aoLimpar,
  busca,
  aoBuscar,
  atalho,
  aoTrocarAtalho,
  contagem,
  acoes,
}: {
  readonly filtros: Filtros;
  readonly aoMudar: (filtros: Filtros) => void;
  readonly aoLimpar: () => void;
  readonly busca: string;
  readonly aoBuscar: (valor: string) => void;
  readonly atalho: Atalho;
  readonly aoTrocarAtalho: (atalho: Atalho) => void;
  readonly contagem: (atalho: Atalho) => number;
  readonly acoes: ReactNode;
}) {
  const mudar = (campo: keyof Filtros) => (valor: string) =>
    aoMudar({ ...filtros, [campo]: valor });

  return (
    <div className="border-hairline-light bg-canvas-light sticky top-0 z-20 border-b px-5 pb-3 pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <Campo rotulo="Pedido" largura="w-[92px]">
          <input
            value={filtros.numero}
            onChange={(evento) => mudar('numero')(evento.target.value)}
            inputMode="numeric"
            placeholder="0000"
            className={`${CAMPO} tabular-nums`}
          />
        </Campo>
        <Campo rotulo="Cliente" largura="min-w-[180px] flex-1">
          <input
            value={filtros.cliente}
            onChange={(evento) => mudar('cliente')(evento.target.value)}
            placeholder="Razão social ou nome"
            className={CAMPO}
          />
        </Campo>
        <Campo rotulo="Representante" largura="min-w-[160px] flex-1">
          <input
            value={filtros.vendedor}
            onChange={(evento) => mudar('vendedor')(evento.target.value)}
            placeholder="Vendedor"
            className={CAMPO}
          />
        </Campo>
        <Campo rotulo="Período" largura="w-auto">
          <span className="flex items-center gap-2">
            <input
              type="date"
              value={filtros.de}
              onChange={(evento) => mudar('de')(evento.target.value)}
              aria-label="Período: data inicial"
              className={`${CAMPO} tabular-nums`}
            />
            <span className="text-body-sm text-stone">até</span>
            <input
              type="date"
              value={filtros.ate}
              onChange={(evento) => mudar('ate')(evento.target.value)}
              aria-label="Período: data final"
              className={`${CAMPO} tabular-nums`}
            />
          </span>
        </Campo>
        <Campo rotulo="Buscar" largura="min-w-[200px] flex-[2]">
          <span className="bg-surface-soft flex h-9 items-center gap-2.5 rounded-xl px-3">
            <Search size={15} className="text-stone" aria-hidden="true" />
            <input
              value={busca}
              onChange={(evento) => aoBuscar(evento.target.value)}
              placeholder="Em qualquer coluna: CNPJ, cidade, bairro…"
              className="text-body-sm text-ink placeholder:text-stone h-full flex-1 bg-transparent outline-none"
            />
          </span>
        </Campo>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {ATALHOS.map((opcao) => {
          const ativo = atalho === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => aoTrocarAtalho(opcao.id)}
              aria-pressed={ativo}
              className={`text-caption inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition ${
                ativo
                  ? 'border-canvas-dark bg-canvas-dark text-white'
                  : 'border-hairline-light text-charcoal hover:bg-surface-soft'
              }`}
            >
              {opcao.rotulo}
              <span className={ativo ? 'text-white/70' : 'text-stone'}>{contagem(opcao.id)}</span>
            </button>
          );
        })}

        {(temFiltro(filtros) || busca.trim() !== '') && (
          <button
            type="button"
            onClick={aoLimpar}
            className="text-caption text-charcoal hover:bg-surface-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition"
          >
            <Eraser size={13} aria-hidden="true" /> Limpar filtros
          </button>
        )}

        <span className="ml-auto">{acoes}</span>
      </div>
    </div>
  );
}
