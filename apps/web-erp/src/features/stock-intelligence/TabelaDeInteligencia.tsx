import {
  Button,
  classesDaLinha,
  DataGridCabecalho,
  DataGridCelula,
  Text,
  type Ordenacao,
} from '@synapse/sdl';
import { Check, Columns3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CelulaDeInteligencia } from './CelulaDeInteligencia';
import { COLUNAS, filtrar, ordenar, proximaOrdenacaoOuNenhuma, type IdDeColuna } from './colunas';
import type { StockIntelligenceMetric } from './stock-intelligence.api';

/** A tabela de Inteligência de Estoque — piloto 3 da fundação de DataGrid
 *  (Fase 5.1), migrando o `components/DataTable.tsx` legado (pré-SDL, único
 *  consumidor). Papéis de coluna, `font-data`, `Status` e a gramática de
 *  linha vêm de `packages/sdl/src/datagrid`; a lógica de ordenação/filtro é
 *  local (ver `colunas.ts`) porque o ciclo de 3 estados desta tela é
 *  semanticamente diferente do ciclo de 2 estados da fila de crédito. */

function SeletorDeColunas({
  ocultas,
  aoAlternar,
}: {
  readonly ocultas: ReadonlySet<IdDeColuna>;
  readonly aoAlternar: (coluna: IdDeColuna) => void;
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
      <Button variant="quiet" onClick={() => setAberto((atual) => !atual)} aria-expanded={aberto}>
        <Columns3 size={14} aria-hidden="true" /> Colunas
      </Button>
      {aberto && (
        <div
          role="menu"
          className="border-hairline-light bg-canvas-light shadow-janela animate-surgir absolute right-0 z-20 mt-2 w-56 rounded-2xl border p-2 motion-reduce:animate-none"
        >
          {COLUNAS.map((coluna) => {
            const visivel = !ocultas.has(coluna.id);
            return (
              <button
                key={coluna.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={visivel}
                onClick={() => aoAlternar(coluna.id)}
                className="text-body-sm text-body hover:bg-surface-soft flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    visivel ? 'bg-primary border-primary text-primary-on' : 'border-hairline-strong'
                  }`}
                >
                  {visivel && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                </span>
                {coluna.rotulo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Linha({
  metric,
  colunasVisiveis,
  branchId,
  aoAjustar,
}: {
  readonly metric: StockIntelligenceMetric;
  readonly colunasVisiveis: typeof COLUNAS;
  readonly branchId: string;
  readonly aoAjustar: (updated: StockIntelligenceMetric) => void;
}) {
  return (
    <tr className={classesDaLinha({ clicavel: false, focoComAnel: false, hairlineNaLinha: true })}>
      {colunasVisiveis.map((coluna) => (
        <DataGridCelula
          key={coluna.id}
          papel={coluna.papel}
          alinhamento={coluna.alinhamento}
          truncar={false}
        >
          <CelulaDeInteligencia
            coluna={coluna.id}
            metric={metric}
            branchId={branchId}
            onAdjusted={aoAjustar}
          />
        </DataGridCelula>
      ))}
    </tr>
  );
}

export interface PropsDaTabelaDeInteligencia {
  readonly linhas: readonly StockIntelligenceMetric[];
  readonly branchId: string;
  readonly busca: string;
  readonly aoBuscar: (valor: string) => void;
  readonly avisoDeVazio: string;
  readonly aoAjustar: (updated: StockIntelligenceMetric) => void;
}

export function TabelaDeInteligencia({
  linhas,
  branchId,
  busca,
  aoBuscar,
  avisoDeVazio,
  aoAjustar,
}: PropsDaTabelaDeInteligencia) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao<IdDeColuna> | null>(null);
  const [ocultas, setOcultas] = useState<ReadonlySet<IdDeColuna>>(new Set());

  const alternarColuna = (id: IdDeColuna) =>
    setOcultas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });

  const colunasVisiveis = COLUNAS.filter((c) => !ocultas.has(c.id));
  const ordenadas = ordenar(filtrar(linhas, busca), ordenacao);

  return (
    <div>
      <div className="border-hairline-light flex items-center gap-2 border-b p-3">
        <div className="relative max-w-xs flex-1">
          <input
            value={busca}
            onChange={(evento) => aoBuscar(evento.target.value)}
            placeholder="Filtrar por nome ou SKU..."
            aria-label="Filtrar por nome ou SKU"
            className="h-controle-padrao border-line-fina bg-surface-afundada rounded-controle text-body-sm focus:border-primary focus:ring-primary/30 w-full border px-3 outline-none focus:ring-2"
          />
        </div>
        <div className="ml-auto">
          <SeletorDeColunas ocultas={ocultas} aoAlternar={alternarColuna} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-hairline-light bg-surface-soft border-b">
              {colunasVisiveis.map((coluna) => (
                <DataGridCabecalho
                  key={coluna.id}
                  id={coluna.id}
                  rotulo={coluna.rotulo}
                  alinhamento={coluna.alinhamento}
                  ordenacao={ordenacao}
                  aoOrdenar={(id) => setOrdenacao((atual) => proximaOrdenacaoOuNenhuma(atual, id))}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((metric) => (
              <Linha
                key={metric.id}
                metric={metric}
                colunasVisiveis={colunasVisiveis}
                branchId={branchId}
                aoAjustar={aoAjustar}
              />
            ))}
          </tbody>
        </table>
        {ordenadas.length === 0 && (
          <Text variant="corpoSecundario" className="block py-10 text-center">
            {avisoDeVazio}
          </Text>
        )}
      </div>
    </div>
  );
}
