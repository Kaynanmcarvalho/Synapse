import type { PainelDeAnaliseDeCredito, PedidoDeVenda } from '@synapse/types';
import type { AvaliacaoDoLote } from '@synapse/validation';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { HistoricoDoCliente, type AbaDoHistorico } from './HistoricoDoCliente';
import { PagamentosDoCliente } from './PagamentosDoCliente';
import { PedidosEmAnalise } from './PedidosEmAnalise';
import { TitulosEmAberto } from './TitulosEmAberto';
import type { Documento } from './documentos/navegacao';
import { SnapshotDoCliente } from './ficha/SnapshotDoCliente';
import type { EstadoDoPainel } from './useAnaliseDeCredito';
import type { Resultado } from './useFichaDoCliente';
import { Falha } from './ui/Superficies';

function Esqueleto() {
  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-12 lg:grid-rows-2" aria-busy="true">
      {[0, 1, 2, 3].map((indice) => (
        <div
          key={indice}
          className={`bg-surface-soft min-h-40 animate-pulse rounded-2xl motion-reduce:animate-none ${
            indice % 2 === 0 ? 'lg:col-span-7' : 'lg:col-span-5'
          }`}
        />
      ))}
    </div>
  );
}

/** Faixa com o resultado da decisao: o que foi ao faturamento, o que ficou e
 *  por que. Some quando o analista fecha. */
function Aviso({
  resultado,
  aoFechar,
}: {
  readonly resultado: NonNullable<Resultado>;
  readonly aoFechar: () => void;
}) {
  const sucesso = resultado.tom === 'sucesso';
  const Icone = sucesso ? CircleCheck : TriangleAlert;
  return (
    <div
      role="status"
      className={`animate-surgir mx-4 mt-3 flex items-start gap-3 rounded-xl border px-4 py-3 motion-reduce:animate-none ${
        sucesso
          ? 'border-accent-teal/30 bg-accent-teal/5 text-accent-green-text'
          : 'border-accent-warning/30 bg-accent-warning/5 text-[#8a4b00]'
      }`}
    >
      <Icone size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-body-sm text-ink flex-1">{resultado.mensagem}</p>
      <button type="button" onClick={aoFechar} className="text-caption text-charcoal underline">
        Fechar
      </button>
    </div>
  );
}

export interface PropsDaFicha {
  readonly painel: EstadoDoPainel;
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly selecionados: ReadonlySet<string>;
  readonly lote: AvaliacaoDoLote;
  readonly aoAlternarSelecao: (id: string) => void;
  readonly aoSelecionarTodos: (marcar: boolean) => void;
  readonly aoAbrirAnalise: (pedido: PedidoDeVenda) => void;
  readonly aoAbrirDocumento: (documento: Documento) => void;
  readonly aoLiberar: () => void;
  readonly liberando: boolean;
  readonly resultado: Resultado;
  readonly aoFecharResultado: () => void;
  readonly aoAbrirCadastro: () => void;
}

function Quadros({
  dados,
  props,
}: {
  readonly dados: PainelDeAnaliseDeCredito;
  readonly props: PropsDaFicha;
}) {
  const parte = (atraso: number, colunas: string) => ({
    style: { animationDelay: `${atraso}ms` },
    className: `animate-subir min-h-0 min-w-0 motion-reduce:animate-none ${colunas}`,
  });
  return (
    <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-12 lg:grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div {...parte(0, 'lg:col-span-7')}>
        <PedidosEmAnalise
          pedidos={dados.pedidosEmAnalise}
          avaliacoes={dados.avaliacoes}
          lote={props.lote}
          selecionados={props.selecionados}
          aoAlternar={props.aoAlternarSelecao}
          aoSelecionarTodos={props.aoSelecionarTodos}
          aoAbrir={props.aoAbrirAnalise}
          aoLiberar={props.aoLiberar}
          liberando={props.liberando}
        />
      </div>
      <div {...parte(60, 'lg:col-span-5')}>
        <HistoricoDoCliente
          aba={props.aba}
          onTrocarAba={props.onTrocarAba}
          pedidos={dados.ultimosPedidos}
          notas={dados.ultimasNotas}
          aoAbrirDocumento={props.aoAbrirDocumento}
        />
      </div>
      <div {...parte(120, 'lg:col-span-7')}>
        <TitulosEmAberto carteira={dados.carteira} aoAbrirDocumento={props.aoAbrirDocumento} />
      </div>
      <div {...parte(180, 'lg:col-span-5')}>
        <PagamentosDoCliente
          carteira={dados.carteira}
          pagoEm12Meses={dados.comportamento.janelas['12M'].pontualidade.pagoCentavos}
          aoAbrirDocumento={props.aoAbrirDocumento}
        />
      </div>
    </div>
  );
}

/** A ficha do cliente: o retrato de credito em cima e as quatro partes na
 *  posicao combinada — pedidos em analise no centro, historico em cima a
 *  direita, titulos a receber embaixo a esquerda e titulos pagos embaixo a
 *  direita. Cada parte rola por dentro. */
export function FichaDoCliente(props: PropsDaFicha) {
  const { painel } = props;
  if (painel.status === 'carregando' || painel.status === 'vazio') return <Esqueleto />;
  if (painel.status === 'erro')
    return <Falha titulo="Não foi possível abrir a análise" texto={painel.mensagem} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SnapshotDoCliente
        dados={painel.dados}
        lote={props.lote}
        aoAbrirCadastro={props.aoAbrirCadastro}
      />
      {props.resultado && <Aviso resultado={props.resultado} aoFechar={props.aoFecharResultado} />}
      <Quadros dados={painel.dados} props={props} />
    </div>
  );
}
