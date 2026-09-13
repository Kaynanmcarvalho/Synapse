import type { PainelDeAnaliseDeCredito, PedidoDeVenda } from '@synapse/types';
import { CircleAlert, ListChecks, RotateCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Total } from './Cartao';
import { FilaDeAnalise } from './FilaDeAnalise';
import { HistoricoDoCliente, type AbaDoHistorico } from './HistoricoDoCliente';
import { PagamentosDoCliente } from './PagamentosDoCliente';
import { PedidosEmAnalise } from './PedidosEmAnalise';
import { TitulosEmAberto } from './TitulosEmAberto';
import { formatarMoeda } from './analise';
import { useAnaliseDeCredito } from './useAnaliseDeCredito';

function Cabecalho({
  dados,
  onTrocarPedido,
  onAtualizar,
}: {
  readonly dados: PainelDeAnaliseDeCredito;
  readonly onTrocarPedido: () => void;
  readonly onAtualizar: () => void;
}) {
  const { cliente, carteira, totalEmAnaliseCentavos } = dados;
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        <p className="text-body-sm text-stone">Análise de crédito</p>
        <h1 className="font-display text-heading-lg text-ink mt-1 truncate">{cliente.nome}</h1>
        {cliente.documento && <p className="text-body-sm text-mute mt-1">{cliente.documento}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Total rotulo="Em análise" valor={formatarMoeda(totalEmAnaliseCentavos)} />
        <Total
          rotulo="Vencido"
          valor={formatarMoeda(carteira.totalVencidoCentavos)}
          tom={carteira.totalVencidoCentavos > 0 ? 'alerta' : 'neutro'}
        />
        <Total rotulo="A vencer" valor={formatarMoeda(carteira.totalAVencerCentavos)} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAtualizar}
            className="bg-surface-soft text-button-sm text-ink inline-flex h-10 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
          >
            <RotateCw size={15} aria-hidden="true" /> Atualizar
          </button>
          <button
            type="button"
            onClick={onTrocarPedido}
            className="bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-10 items-center gap-2 rounded-full px-5 text-white transition"
          >
            <ListChecks size={15} aria-hidden="true" /> Fila de pedidos
          </button>
        </div>
      </div>
    </header>
  );
}

function Esqueleto() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {[0, 1, 2, 3].map((indice) => (
        <div
          key={indice}
          className={`bg-surface-soft h-72 animate-pulse rounded-2xl ${indice % 2 === 0 ? 'lg:col-span-7' : 'lg:col-span-5'}`}
        />
      ))}
    </div>
  );
}

function Aviso({ texto }: { readonly texto: string }) {
  return (
    <div
      role="alert"
      className="border-hairline-light mx-auto mt-24 flex max-w-xl flex-col items-start gap-3 rounded-2xl border p-6"
    >
      <span className="bg-surface-soft text-accent-danger flex h-11 w-11 items-center justify-center rounded-full">
        <CircleAlert size={20} aria-hidden="true" />
      </span>
      <p className="text-body-md text-ink font-semibold">Não foi possível abrir a análise</p>
      <p className="text-body-sm text-mute">{texto}</p>
    </div>
  );
}

/** As quatro partes da analise, na posicao combinada: pedidos no centro,
 *  historico em cima a direita, titulos em aberto embaixo a esquerda e
 *  pagamentos embaixo a direita. */
function Grade({
  dados,
  aba,
  onTrocarAba,
  abertos,
  onAlternar,
}: {
  readonly dados: PainelDeAnaliseDeCredito;
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly abertos: ReadonlySet<string>;
  readonly onAlternar: (id: string) => void;
}) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-7">
        <PedidosEmAnalise
          pedidos={dados.pedidosEmAnalise}
          totalCentavos={dados.totalEmAnaliseCentavos}
          abertos={abertos}
          onAlternar={onAlternar}
        />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <HistoricoDoCliente
          aba={aba}
          onTrocarAba={onTrocarAba}
          pedidos={dados.ultimosPedidos}
          notas={dados.ultimasNotas}
        />
      </div>
      <div className="min-w-0 lg:col-span-7">
        <TitulosEmAberto carteira={dados.carteira} />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <PagamentosDoCliente carteira={dados.carteira} />
      </div>
    </div>
  );
}

/** Analise de credito: a fila de pedidos que os vendedores mandaram — do
 *  desktop ou do celular — e, atras dela, a ficha inteira do cliente. O pedido
 *  escolhido manda na tela: tudo que aparece e daquele cliente. */
export function AnaliseDeCreditoScreen() {
  const { fila, painel, carregarFila, abrirCliente } = useAnaliseDeCredito();
  const [modalAberto, setModalAberto] = useState(true);
  const [aba, setAba] = useState<AbaDoHistorico>('pedidos');
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  const [clienteAtual, setClienteAtual] = useState<string | null>(null);

  const escolher = useCallback(
    (pedido: PedidoDeVenda) => {
      setModalAberto(false);
      setClienteAtual(pedido.customerId);
      // O pedido escolhido ja abre detalhado: foi por ele que o analista entrou.
      setAbertos(new Set([pedido.id]));
      void abrirCliente(pedido.customerId);
    },
    [abrirCliente],
  );

  const alternar = useCallback((id: string) => {
    setAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (!proximos.delete(id)) proximos.add(id);
      return proximos;
    });
  }, []);

  const atualizar = useCallback(() => {
    void carregarFila();
    if (clienteAtual) void abrirCliente(clienteAtual);
  }, [carregarFila, abrirCliente, clienteAtual]);

  const dados = painel.status === 'pronto' ? painel.dados : null;

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      {painel.status === 'vazio' && !modalAberto && (
        <div className="mt-24 text-center">
          <p className="text-body-md text-mute">Escolha um pedido para começar a análise.</p>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="bg-canvas-dark text-button-md hover:bg-charcoal mt-5 inline-flex h-12 items-center gap-2 rounded-full px-7 text-white transition"
          >
            <ListChecks size={17} aria-hidden="true" /> Ver a fila de pedidos
          </button>
        </div>
      )}

      {painel.status === 'carregando' && <Esqueleto />}

      {painel.status === 'erro' && <Aviso texto={painel.mensagem} />}

      {dados && (
        <>
          <Cabecalho
            dados={dados}
            onTrocarPedido={() => setModalAberto(true)}
            onAtualizar={atualizar}
          />
          <Grade
            dados={dados}
            aba={aba}
            onTrocarAba={setAba}
            abertos={abertos}
            onAlternar={alternar}
          />
        </>
      )}

      {modalAberto && (
        <FilaDeAnalise
          pedidos={fila.status === 'pronto' ? fila.pedidos : []}
          carregando={fila.status === 'carregando'}
          erro={fila.status === 'erro' ? fila.mensagem : null}
          podeFechar={painel.status !== 'vazio'}
          onEscolher={escolher}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </main>
  );
}
