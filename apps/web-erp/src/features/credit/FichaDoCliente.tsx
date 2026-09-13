import type { PainelDeAnaliseDeCredito, PedidoDeVenda } from '@synapse/types';
import { CircleAlert, CircleCheck, UserPen } from 'lucide-react';
import { Total } from './Cartao';
import { HistoricoDoCliente, type AbaDoHistorico } from './HistoricoDoCliente';
import { PagamentosDoCliente } from './PagamentosDoCliente';
import { PedidosEmAnalise } from './PedidosEmAnalise';
import { TitulosEmAberto } from './TitulosEmAberto';
import { formatarDocumento, formatarMoeda } from './analise';
import type { EstadoDoPainel } from './useAnaliseDeCredito';

function Resumo({
  dados,
  aoAbrirCadastro,
}: {
  readonly dados: PainelDeAnaliseDeCredito;
  readonly aoAbrirCadastro: () => void;
}) {
  const { cliente, carteira, totalEmAnaliseCentavos } = dados;
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 pt-4">
      <span className="flex flex-col">
        <span className="text-caption text-stone">CNPJ / CPF</span>
        <strong className="text-body-md text-ink font-semibold tabular-nums">
          {formatarDocumento(cliente.documento) || '—'}
        </strong>
      </span>
      <Total rotulo="Em análise" valor={formatarMoeda(totalEmAnaliseCentavos)} />
      <Total
        rotulo="Vencido"
        valor={formatarMoeda(carteira.totalVencidoCentavos)}
        tom={carteira.totalVencidoCentavos > 0 ? 'alerta' : 'neutro'}
      />
      <Total rotulo="A vencer" valor={formatarMoeda(carteira.totalAVencerCentavos)} />
      <Total
        rotulo="Total pago"
        valor={formatarMoeda(carteira.totalPagoCentavos)}
        tom={carteira.totalPagoCentavos > 0 ? 'positivo' : 'neutro'}
      />
      <button
        type="button"
        onClick={aoAbrirCadastro}
        className="bg-surface-soft text-button-sm text-ink ml-auto inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
      >
        <UserPen size={15} aria-hidden="true" /> Cadastro do cliente
      </button>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-12 lg:grid-rows-2">
      {[0, 1, 2, 3].map((indice) => (
        <div
          key={indice}
          className={`bg-surface-soft min-h-40 animate-pulse rounded-2xl ${
            indice % 2 === 0 ? 'lg:col-span-7' : 'lg:col-span-5'
          }`}
        />
      ))}
    </div>
  );
}

function Aviso({ texto }: { readonly texto: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 p-8">
      <span className="bg-surface-soft text-accent-danger flex h-11 w-11 items-center justify-center rounded-full">
        <CircleAlert size={20} aria-hidden="true" />
      </span>
      <p className="text-body-md text-ink font-semibold">Não foi possível abrir a análise</p>
      <p className="text-body-sm text-mute">{texto}</p>
    </div>
  );
}

/** Faixa com o resultado da liberacao: o que foi para o faturamento e o que
 *  ficou, com o motivo. Some quando o analista fecha. */
function ResultadoDaLiberacao({
  mensagem,
  tom,
  aoFechar,
}: {
  readonly mensagem: string;
  readonly tom: 'sucesso' | 'alerta';
  readonly aoFechar: () => void;
}) {
  return (
    <div
      role="status"
      className={`animate-surgir mx-4 mt-3 flex items-start gap-3 rounded-xl border px-4 py-3 motion-reduce:animate-none ${
        tom === 'sucesso'
          ? 'border-accent-teal/30 bg-accent-teal/5 text-accent-teal'
          : 'border-accent-warning/30 bg-accent-warning/5 text-accent-warning'
      }`}
    >
      <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-body-sm text-ink flex-1">{mensagem}</p>
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
  readonly aoAlternarSelecao: (id: string) => void;
  readonly aoSelecionarTodos: (marcar: boolean) => void;
  readonly aoAbrirPedido: (pedido: PedidoDeVenda | string) => void;
  readonly aoLiberar: () => void;
  readonly liberando: boolean;
  readonly resultado: { readonly mensagem: string; readonly tom: 'sucesso' | 'alerta' } | null;
  readonly aoFecharResultado: () => void;
  readonly aoAbrirCadastro: () => void;
}

/** As quatro partes da ficha, na posicao combinada: pedidos em analise no
 *  centro, historico em cima a direita, titulos a receber embaixo a esquerda e
 *  titulos pagos embaixo a direita. Cada parte rola por dentro, entao a janela
 *  inteira cabe na tela mesmo com muito registro. */
export function FichaDoCliente(props: PropsDaFicha) {
  const { painel } = props;
  if (painel.status === 'carregando' || painel.status === 'vazio') return <Esqueleto />;
  if (painel.status === 'erro') return <Aviso texto={painel.mensagem} />;

  const { dados } = painel;
  const abrir = (pedidoId: string) => props.aoAbrirPedido(pedidoId);
  const parte = (atraso: number, colunas: string) => ({
    style: { animationDelay: `${atraso}ms` },
    className: `animate-subir min-h-0 min-w-0 motion-reduce:animate-none ${colunas}`,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Resumo dados={dados} aoAbrirCadastro={props.aoAbrirCadastro} />
      {props.resultado && (
        <ResultadoDaLiberacao
          mensagem={props.resultado.mensagem}
          tom={props.resultado.tom}
          aoFechar={props.aoFecharResultado}
        />
      )}
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-12 lg:grid-rows-[1.15fr_1fr]">
        <div {...parte(0, 'lg:col-span-7')}>
          <PedidosEmAnalise
            pedidos={dados.pedidosEmAnalise}
            selecionados={props.selecionados}
            aoAlternar={props.aoAlternarSelecao}
            aoSelecionarTodos={props.aoSelecionarTodos}
            aoAbrir={props.aoAbrirPedido}
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
            aoAbrirPedido={abrir}
          />
        </div>
        <div {...parte(120, 'lg:col-span-7')}>
          <TitulosEmAberto carteira={dados.carteira} aoAbrirPedido={abrir} />
        </div>
        <div {...parte(180, 'lg:col-span-5')}>
          <PagamentosDoCliente carteira={dados.carteira} aoAbrirPedido={abrir} />
        </div>
      </div>
    </div>
  );
}
