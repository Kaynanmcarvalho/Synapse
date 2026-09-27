import { Button, Input } from '@synapse/sdl';
import { Eraser, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { ATALHOS, type Atalho } from './colunas';
import { temFiltro, type Filtros } from './filtros';

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
      <span className="text-caption text-ink-medio font-medium">{rotulo}</span>
      {children}
    </label>
  );
}

function CampoDeBusca({
  busca,
  aoBuscar,
}: {
  readonly busca: string;
  readonly aoBuscar: (valor: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        size={15}
        aria-hidden="true"
        className="text-stone pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
      />
      <Input
        value={busca}
        onChange={(evento) => aoBuscar(evento.target.value)}
        placeholder="Em qualquer coluna: CNPJ, cidade, bairro…"
        className="w-full pl-9"
      />
    </div>
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
      <span className="text-caption text-ink-medio font-medium">Período</span>
      <span className="flex items-center gap-2">
        <Input
          type="date"
          value={de}
          max={ate || undefined}
          onChange={(evento) => aoMudarDe(evento.target.value)}
          aria-label="Período: data inicial"
          className="font-data"
        />
        <span className="text-body-sm text-stone">até</span>
        <Input
          type="date"
          value={ate}
          min={de || undefined}
          onChange={(evento) => aoMudarAte(evento.target.value)}
          aria-label="Período: data final"
          className="font-data"
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
            className={`text-caption rounded-controle duration-rapido inline-flex items-center gap-1.5 border px-3 py-1 transition-colors ${
              ativo
                ? 'border-primary bg-primary text-primary-on'
                : 'border-hairline-light text-charcoal hover:bg-surface-hover'
            }`}
          >
            {opcao.rotulo}
            <span className={ativo ? 'text-primary-on/70' : 'text-stone'}>
              {contagem(opcao.id)}
            </span>
          </button>
        );
      })}

      {podeLimpar && (
        <Button
          variant="quiet"
          density="compacta"
          onClick={aoLimpar}
          className="animate-revelar motion-reduce:animate-none"
        >
          <Eraser size={13} aria-hidden="true" /> Limpar filtros
        </Button>
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
          <Input
            value={filtros.numero}
            onChange={(evento) => mudar('numero')(evento.target.value)}
            inputMode="numeric"
            placeholder="0000"
            align="right"
          />
        </Campo>
        <Campo rotulo="Cliente" largura="min-w-[180px] flex-1">
          <Input
            value={filtros.cliente}
            onChange={(evento) => mudar('cliente')(evento.target.value)}
            placeholder="Razão social ou nome"
          />
        </Campo>
        <Campo rotulo="Representante" largura="min-w-[160px] flex-1">
          <Input
            value={filtros.vendedor}
            onChange={(evento) => mudar('vendedor')(evento.target.value)}
            placeholder="Vendedor"
          />
        </Campo>
        <Periodo
          de={filtros.de}
          ate={filtros.ate}
          aoMudarDe={mudar('de')}
          aoMudarAte={mudar('ate')}
        />
        <Campo rotulo="Buscar" largura="min-w-[200px] flex-[2]">
          <CampoDeBusca busca={busca} aoBuscar={aoBuscar} />
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
