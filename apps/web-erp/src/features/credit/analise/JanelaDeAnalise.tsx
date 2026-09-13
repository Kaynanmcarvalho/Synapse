import type {
  AcaoDeCredito,
  PainelDeAnaliseDeCredito,
  PedidoDeVenda,
  ResultadoDaDecisao,
} from '@synapse/types';
import { useEffect, useRef, useState } from 'react';
import { registrarVisualizacao } from '../analise.api';
import { Janela } from '../janela/Janela';
import { aoAbrir, type Area } from '../janela/geometria';
import type { Pilha } from '../pilha';
import { AbaFinanceiro } from './AbaFinanceiro';
import { AbaHistorico } from './AbaHistorico';
import { AbaObservacoes } from './AbaObservacoes';
import { AbaResumo } from './AbaResumo';
import { AcoesDaDecisao } from './AcoesDaDecisao';
import { CabecalhoDaAnalise } from './CabecalhoDaAnalise';
import { DialogoDeDecisao } from './DialogoDeDecisao';
import { PainelDeDecisao } from './PainelDeDecisao';
import { useDecisao } from './useDecisao';
import { useLargura } from './useLargura';

const ABERTURA = (area: Area) => aoAbrir(area, 0.84, 0.92, 'centro');

/** Abaixo disto o painel de decisao desce para baixo do cabecalho. */
const LARGURA_EM_DUAS_COLUNAS = 900;

type Aba = 'resumo' | 'financeiro' | 'historico' | 'observacoes';

function Abas({
  aba,
  aoTrocar,
  pedido,
}: {
  readonly aba: Aba;
  readonly aoTrocar: (aba: Aba) => void;
  readonly pedido: PedidoDeVenda;
}) {
  const opcoes: ReadonlyArray<{ id: Aba; rotulo: string; contagem?: number }> = [
    { id: 'resumo', rotulo: 'Resumo' },
    { id: 'financeiro', rotulo: 'Financeiro' },
    { id: 'historico', rotulo: 'Histórico', contagem: pedido.historico?.length ?? 0 },
    { id: 'observacoes', rotulo: 'Observações', contagem: pedido.observacoes?.length ?? 0 },
  ];
  return (
    <div
      role="tablist"
      aria-label={`Pedido ${pedido.numero}`}
      className="flex gap-1 overflow-x-auto"
    >
      {opcoes.map((opcao) => (
        <button
          key={opcao.id}
          type="button"
          role="tab"
          aria-selected={aba === opcao.id}
          onClick={() => aoTrocar(opcao.id)}
          className={`text-button-sm inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 transition ${
            aba === opcao.id
              ? 'bg-canvas-dark text-white'
              : 'text-charcoal hover:bg-surface-soft hover:text-ink'
          }`}
        >
          {opcao.rotulo}
          {opcao.contagem ? (
            <span
              className={`text-caption rounded-full px-1.5 tabular-nums ${aba === opcao.id ? 'bg-white/20' : 'bg-surface-soft text-stone'}`}
            >
              {opcao.contagem}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

interface PropsDaAnalise {
  readonly painel: PainelDeAnaliseDeCredito;
  readonly pedido: PedidoDeVenda;
  readonly aoObservar: (texto: string) => Promise<void>;
  readonly aoAbrirCadastro: () => void;
  readonly aoDecidir: (resultado: ResultadoDaDecisao, acao: AcaoDeCredito) => void;
}

function Conteudo({ painel, pedido, aoObservar, aoAbrirCadastro, aoDecidir }: PropsDaAnalise) {
  const [aba, setAba] = useState<Aba>('resumo');
  const caixa = useRef<HTMLDivElement>(null);
  const largo = useLargura(caixa) >= LARGURA_EM_DUAS_COLUNAS;
  const avaliacao = painel.avaliacoes.find((item) => item.pedidoId === pedido.id) ?? null;
  const decisao = useDecisao(pedido.id, aoDecidir);
  const lateral = (
    <PainelDeDecisao
      avaliacao={avaliacao}
      comportamento={painel.comportamento}
      parametros={painel.parametros}
    />
  );

  const conteudo = (
    <div key={aba} role="tabpanel" className="animate-revelar motion-reduce:animate-none">
      {aba === 'resumo' && (
        <AbaResumo
          pedido={pedido}
          avaliacao={avaliacao}
          cliente={painel.cliente}
          carteira={painel.carteira}
          aoAbrirCadastro={aoAbrirCadastro}
        />
      )}
      {aba === 'financeiro' && (
        <AbaFinanceiro pedido={pedido} avaliacao={avaliacao} parametros={painel.parametros} />
      )}
      {aba === 'historico' && <AbaHistorico historico={pedido.historico ?? []} />}
      {aba === 'observacoes' && <AbaObservacoes pedido={pedido} aoObservar={aoObservar} />}
    </div>
  );

  return (
    <div ref={caixa} className="flex h-full min-h-0 flex-col">
      <CabecalhoDaAnalise pedido={pedido} avaliacao={avaliacao} />
      {largo ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,35%)]">
          <div className="min-h-0 overflow-y-auto bg-[#fafafa] p-4">
            <div className="mb-3">
              <Abas aba={aba} aoTrocar={setAba} pedido={pedido} />
            </div>
            {conteudo}
          </div>
          <aside
            aria-label="Painel de decisão"
            className="border-hairline-light min-h-0 overflow-y-auto border-l bg-[#f6f6f7] p-4"
          >
            {lateral}
          </aside>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] p-4">
          {lateral}
          <div className="my-3">
            <Abas aba={aba} aoTrocar={setAba} pedido={pedido} />
          </div>
          {conteudo}
        </div>
      )}
      <AcoesDaDecisao
        pedido={pedido}
        avaliacao={avaliacao}
        permissoes={painel.permissoes}
        aoEscolher={decisao.abrir}
      />
      {decisao.acao && avaliacao && (
        <DialogoDeDecisao
          acao={decisao.acao}
          pedido={pedido}
          avaliacao={avaliacao}
          enviando={decisao.enviando}
          erro={decisao.erro}
          aoConfirmar={(justificativa) => void decisao.confirmar(justificativa)}
          aoCancelar={decisao.fechar}
        />
      )}
    </div>
  );
}

/** A analise de credito de um pedido: janela propria, separada do detalhe de
 *  pedido historico, de nota e de titulo. Abrir registra "visualizado" (a API
 *  guarda no maximo um por pessoa a cada meia hora). */
export function JanelaDeAnalise(props: Pilha & PropsDaAnalise) {
  const { painel, pedido, aoObservar, aoAbrirCadastro, aoDecidir, ...pilha } = props;
  useEffect(() => {
    void registrarVisualizacao(pedido.id).catch(() => undefined);
  }, [pedido.id]);

  return (
    <Janela
      id="analise-de-credito.analise"
      titulo={`Pedido #${pedido.numero} · ${pedido.clienteNome}`}
      subtitulo="Análise de crédito do pedido"
      abertura={ABERTURA}
      {...pilha}
    >
      <Conteudo
        painel={painel}
        pedido={pedido}
        aoObservar={aoObservar}
        aoAbrirCadastro={aoAbrirCadastro}
        aoDecidir={aoDecidir}
      />
    </Janela>
  );
}
