import type { PedidoNaFila } from '@synapse/types';
import { RotateCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { CamadaDoCliente, type ClienteEscolhido } from './CamadaDoCliente';
import { ConteudoDaFila } from './FilaDeAnalise';
import { Fundo } from './Fundo';
import { Janela } from './janela/Janela';
import { aoAbrir, type Area } from './janela/geometria';
import { useAreaDaTela } from './janela/useAreaDaTela';
import { usePilha, type Pilha } from './pilha';
import { useAnaliseDeCredito, type EstadoDaFila } from './useAnaliseDeCredito';

/** Tamanho de estreia da fila, usado so na primeira vez: larga o bastante para
 *  a tabela. Depois disso vale o que o usuario deixou. */
const ABERTURA_DA_FILA = (area: Area) => aoAbrir(area, 0.62, 0.9, 'esquerda');

/** So escurece o que esta atras das janelas: o menu do sistema continua
 *  clicavel, e por isso a cortina comeca abaixo do cabecalho. */
function Cortina({ topo }: { readonly topo: number }) {
  return (
    <div
      aria-hidden="true"
      className="bg-canvas-dark/10 animate-revelar pointer-events-none fixed inset-x-0 bottom-0 z-30 motion-reduce:animate-none"
      style={{ top: topo }}
    />
  );
}

function JanelaDaFila({
  fila,
  aoRecarregar,
  aoEscolher,
  aoAlternarImpressao,
  ...pilha
}: Pilha & {
  readonly fila: EstadoDaFila;
  readonly aoRecarregar: () => void;
  readonly aoEscolher: (linha: PedidoNaFila) => void;
  readonly aoAlternarImpressao: (linha: PedidoNaFila) => void;
}) {
  return (
    <Janela
      id="analise-de-credito.fila"
      titulo="Fila de pedidos"
      subtitulo="Aguardando análise"
      abertura={ABERTURA_DA_FILA}
      acoes={
        <button
          type="button"
          onClick={aoRecarregar}
          className="bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]"
        >
          <RotateCw size={14} aria-hidden="true" /> Atualizar
        </button>
      }
      {...pilha}
    >
      <ConteudoDaFila
        linhas={fila.status === 'pronto' ? fila.pedidos : []}
        carregando={fila.status === 'carregando'}
        erro={fila.status === 'erro' ? fila.mensagem : null}
        onAbrir={aoEscolher}
        onAlternarImpressao={aoAlternarImpressao}
      />
    </Janela>
  );
}

/** Analise de credito: a fila de pedidos que os vendedores mandaram e, por cima
 *  dela, tudo que se abre a partir do cliente escolhido. */
export function AnaliseDeCreditoScreen() {
  const { fila, painel, carregarFila, abrirCliente, alternarImpressao } = useAnaliseDeCredito();
  const { area } = useAreaDaTela();
  const janelas = usePilha();
  const { ordem, focar, fechar, pilha } = janelas;
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);

  const recarregar = useCallback(() => {
    void carregarFila();
    if (cliente) void abrirCliente(cliente.id);
  }, [carregarFila, abrirCliente, cliente]);

  const escolher = useCallback(
    ({ pedido }: PedidoNaFila) => {
      setCliente({
        id: pedido.customerId,
        nome: pedido.clienteNome,
        pedidoInicial: pedido.id,
        escolhidoEm: Date.now(),
      });
      fechar('pedido', 'parcelas', 'cadastro');
      void abrirCliente(pedido.customerId);
      // A ficha sempre sobe: ela e a resposta ao clique, e nao pode nascer atras.
      focar('cliente');
    },
    [abrirCliente, fechar, focar],
  );

  return (
    <>
      <Fundo
        fila={fila}
        aoAbrirFila={() => focar('fila')}
        aoAbrirCliente={cliente ? () => focar('cliente') : null}
      />
      {ordem.length > 0 && <Cortina topo={area.topo} />}

      {ordem.includes('fila') && (
        <JanelaDaFila
          fila={fila}
          aoRecarregar={() => void carregarFila()}
          aoEscolher={escolher}
          aoAlternarImpressao={(linha) => void alternarImpressao(linha.pedido.id, !linha.impresso)}
          {...pilha('fila')}
        />
      )}

      {cliente && (
        <CamadaDoCliente
          cliente={cliente}
          painel={painel}
          janelas={janelas}
          recarregar={recarregar}
        />
      )}
    </>
  );
}
