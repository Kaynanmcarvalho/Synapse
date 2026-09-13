import type { PedidoNaFila } from '@synapse/types';
import { useMemo, useState } from 'react';
import { FiltrosDaFila } from './fila/FiltrosDaFila';
import { RodapeDaFila } from './fila/RodapeDaFila';
import { SeletorDeColunas } from './fila/SeletorDeColunas';
import { TabelaDaFila } from './fila/TabelaDaFila';
import { aplicarAtalho, filtrarFila, ordenarFila, type Atalho } from './fila/colunas';
import { aplicarFiltros, FILTROS_VAZIOS, type Filtros } from './fila/filtros';
import { usePreferenciasDaFila } from './fila/usePreferenciasDaFila';

/** Conteudo da janela da fila: tudo que os vendedores mandaram e ainda espera
 *  decisao, em tabela. Cada usuario deixa as colunas na ordem e na largura que
 *  trabalha, e a tela abre assim na proxima vez. */
export function ConteudoDaFila({
  linhas,
  carregando,
  erro,
  onAbrir,
  onAlternarImpressao,
}: {
  readonly linhas: readonly PedidoNaFila[];
  readonly carregando: boolean;
  readonly erro: string | null;
  readonly onAbrir: (linha: PedidoNaFila) => void;
  readonly onAlternarImpressao: (linha: PedidoNaFila) => void;
}) {
  const preferencias = usePreferenciasDaFila();
  const { ordem, ordenacao } = preferencias;
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [atalho, setAtalho] = useState<Atalho>('todos');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  // O periodo e os campos valem para tudo: atalhos, contagem e totais saem
  // sempre do mesmo recorte, senao o rodape contaria o que a tela nao mostra.
  const noPeriodo = useMemo(() => aplicarFiltros(linhas, filtros), [linhas, filtros]);

  const visiveis = useMemo(
    () => ordenarFila(filtrarFila(aplicarAtalho(noPeriodo, atalho), busca, ordem), ordenacao),
    [noPeriodo, atalho, busca, ordem, ordenacao],
  );

  const selecionada = visiveis.find((linha) => linha.pedido.id === selecionado) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FiltrosDaFila
        filtros={filtros}
        aoMudar={setFiltros}
        aoLimpar={() => {
          setFiltros(FILTROS_VAZIOS);
          setBusca('');
        }}
        busca={busca}
        aoBuscar={setBusca}
        atalho={atalho}
        aoTrocarAtalho={setAtalho}
        contagem={(opcao) => aplicarAtalho(noPeriodo, opcao).length}
        acoes={
          <SeletorDeColunas
            ordem={ordem}
            aoAlternar={preferencias.alternar}
            aoRestaurar={preferencias.restaurar}
          />
        }
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
            largura={preferencias.largura}
            selecionado={selecionado}
            aoSelecionar={(linha) => setSelecionado(linha.pedido.id)}
            aoAbrir={(linha) => {
              setSelecionado(linha.pedido.id);
              onAbrir(linha);
            }}
            aoOrdenar={preferencias.ordenarPor}
            aoMover={preferencias.mover}
            aoRedimensionar={preferencias.redimensionar}
            aoRestaurarLargura={preferencias.restaurarLargura}
            aoAlternarImpressao={onAlternarImpressao}
          />
        )}
      </div>

      <RodapeDaFila linhas={visiveis} selecionada={selecionada} />
    </div>
  );
}
