import type { PedidoNaFila } from '@synapse/types';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatarMoeda } from './analise';
import { SeletorDeColunas } from './fila/SeletorDeColunas';
import { TabelaDaFila } from './fila/TabelaDaFila';
import {
  aplicarAtalho,
  ATALHOS,
  dataLocal,
  filtrarFila,
  ordenarFila,
  totaisDaFila,
  type Atalho,
} from './fila/colunas';
import { usePreferenciasDaFila } from './fila/usePreferenciasDaFila';

function Barra({
  busca,
  aoBuscar,
  atalho,
  aoTrocarAtalho,
  contagem,
  filhos,
}: {
  readonly busca: string;
  readonly aoBuscar: (valor: string) => void;
  readonly atalho: Atalho;
  readonly aoTrocarAtalho: (atalho: Atalho) => void;
  readonly contagem: (atalho: Atalho) => number;
  readonly filhos: React.ReactNode;
}) {
  return (
    <div className="border-hairline-light bg-canvas-light sticky top-0 z-20 border-b px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="bg-surface-soft flex h-9 min-w-[240px] flex-1 items-center gap-2.5 rounded-full px-4">
          <Search size={15} className="text-stone" aria-hidden="true" />
          <input
            value={busca}
            onChange={(evento) => aoBuscar(evento.target.value)}
            placeholder="Buscar em qualquer coluna: cliente, CNPJ, cidade, representante…"
            className="text-body-sm text-ink placeholder:text-stone h-full flex-1 bg-transparent outline-none"
          />
        </label>
        {filhos}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ATALHOS.map((opcao) => {
          const ativo = atalho === opcao.id;
          const quantos = contagem(opcao.id);
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
              <span className={ativo ? 'text-white/70' : 'text-stone'}>{quantos}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Rodape({ linhas }: { readonly linhas: readonly PedidoNaFila[] }) {
  const totais = totaisDaFila(linhas);
  return (
    <div className="border-hairline-light bg-canvas-light sticky bottom-0 flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-5 py-3">
      <span className="text-caption text-stone">
        {totais.pedidos} pedido(s) · {totais.clientes} cliente(s)
      </span>
      <span className="flex items-center gap-2">
        <span className="text-caption text-stone">Total</span>
        <strong className="text-body-sm text-ink font-semibold tabular-nums">
          {formatarMoeda(totais.valorCentavos)}
        </strong>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-caption text-stone">Vencido dos clientes</span>
        <strong
          className={`text-body-sm font-semibold tabular-nums ${
            totais.vencidoCentavos > 0 ? 'text-accent-danger' : 'text-ink'
          }`}
        >
          {formatarMoeda(totais.vencidoCentavos)}
        </strong>
      </span>
      <span className="text-caption text-faint ml-auto hidden lg:block">
        Dois cliques no título da coluna ordenam · arraste para reordenar
      </span>
    </div>
  );
}

/** Conteudo da janela da fila: tudo que os vendedores mandaram e ainda espera
 *  decisao, em tabela. Cada usuario deixa as colunas na ordem que trabalha e a
 *  tela abre assim na proxima vez. */
export function ConteudoDaFila({
  linhas,
  carregando,
  erro,
  clienteSelecionado,
  onEscolher,
}: {
  readonly linhas: readonly PedidoNaFila[];
  readonly carregando: boolean;
  readonly erro: string | null;
  readonly clienteSelecionado: string | null;
  readonly onEscolher: (linha: PedidoNaFila) => void;
}) {
  const { ordem, ordenacao, ordenarPor, mover, alternar, restaurar } = usePreferenciasDaFila();
  const [busca, setBusca] = useState('');
  const [atalho, setAtalho] = useState<Atalho>('todos');
  const hoje = dataLocal(new Date().toISOString());

  const visiveis = useMemo(
    () => ordenarFila(filtrarFila(aplicarAtalho(linhas, atalho, hoje), busca, ordem), ordenacao),
    [linhas, atalho, hoje, busca, ordem, ordenacao],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Barra
        busca={busca}
        aoBuscar={setBusca}
        atalho={atalho}
        aoTrocarAtalho={setAtalho}
        contagem={(opcao) => aplicarAtalho(linhas, opcao, hoje).length}
        filhos={<SeletorDeColunas ordem={ordem} aoAlternar={alternar} aoRestaurar={restaurar} />}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {erro && <p className="text-body-sm text-accent-danger py-10 text-center">{erro}</p>}
        {!erro && carregando && (
          <p className="text-body-sm text-stone py-10 text-center">Carregando a fila…</p>
        )}
        {!erro && !carregando && visiveis.length === 0 && (
          <p className="text-body-sm text-stone py-12 text-center">
            {linhas.length === 0
              ? 'Nenhum pedido esperando análise.'
              : 'Nenhum pedido com esse filtro.'}
          </p>
        )}
        {!erro && visiveis.length > 0 && (
          <TabelaDaFila
            linhas={visiveis}
            ordem={ordem}
            ordenacao={ordenacao}
            clienteSelecionado={clienteSelecionado}
            aoOrdenar={ordenarPor}
            aoMover={mover}
            aoEscolher={onEscolher}
          />
        )}
      </div>

      <Rodape linhas={visiveis} />
    </div>
  );
}
