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

/** Dois campos de data soltos, e nao dentro de um mesmo rotulo: um <label>
 *  com dois campos manda o clique do texto sempre para o primeiro. */
function Periodo({
  de,
  ate,
  aoMudarDe,
  aoMudarAte,
}: {
  readonly de: string;
  readonly ate: string;
  readonly aoMudarDe: (valor: string) => void;
  readonly aoMudarAte: (valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-stone font-semibold uppercase tracking-[0.06em]">
        Período
      </span>
      <span className="flex items-center gap-2">
        <input
          type="date"
          value={de}
          max={ate || undefined}
          onChange={(evento) => aoMudarDe(evento.target.value)}
          aria-label="Período: data inicial"
          className={`${CAMPO} tabular-nums`}
        />
        <span className="text-body-sm text-stone">até</span>
        <input
          type="date"
          value={ate}
          min={de || undefined}
          onChange={(evento) => aoMudarAte(evento.target.value)}
          aria-label="Período: data final"
          className={`${CAMPO} tabular-nums`}
        />
      </span>
    </div>
  );
}

function Atalhos({
  atalho,
  aoTrocar,
  contagem,
  podeLimpar,
  aoLimpar,
  acoes,
}: {
  readonly atalho: Atalho;
  readonly aoTrocar: (atalho: Atalho) => void;
  readonly contagem: (atalho: Atalho) => number;
  readonly podeLimpar: boolean;
  readonly aoLimpar: () => void;
  readonly acoes: ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {ATALHOS.map((opcao) => {
        const ativo = atalho === opcao.id;
        return (
          <button
            key={opcao.id}
            type="button"
            onClick={() => aoTrocar(opcao.id)}
            aria-pressed={ativo}
            className={`text-caption inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition duration-200 ${
              ativo
                ? 'border-canvas-dark bg-canvas-dark shadow-cartao text-white'
                : 'border-hairline-light text-charcoal hover:bg-surface-soft'
            }`}
          >
            {opcao.rotulo}
            <span className={ativo ? 'text-white/70' : 'text-stone'}>{contagem(opcao.id)}</span>
          </button>
        );
      })}

      {podeLimpar && (
        <button
          type="button"
          onClick={aoLimpar}
          className="text-caption text-charcoal hover:bg-surface-soft animate-revelar inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition motion-reduce:animate-none"
        >
          <Eraser size={13} aria-hidden="true" /> Limpar filtros
        </button>
      )}

      <span className="ml-auto">{acoes}</span>
    </div>
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
        <Periodo
          de={filtros.de}
          ate={filtros.ate}
          aoMudarDe={mudar('de')}
          aoMudarAte={mudar('ate')}
        />
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

      <Atalhos
        atalho={atalho}
        aoTrocar={aoTrocarAtalho}
        contagem={contagem}
        podeLimpar={temFiltro(filtros) || busca.trim() !== ''}
        aoLimpar={aoLimpar}
        acoes={acoes}
      />
    </div>
  );
}
