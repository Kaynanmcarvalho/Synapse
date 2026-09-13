import type { PedidoNaFila } from '@synapse/types';
import { ListChecks, RotateCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ConteudoDaFila } from './FilaDeAnalise';
import { FichaDoCliente } from './FichaDoCliente';
import { Fundo } from './Fundo';
import type { AbaDoHistorico } from './HistoricoDoCliente';
import { Janela } from './janela/Janela';
import { aoAbrir, type Area } from './janela/geometria';
import { useAreaDaTela } from './janela/useAreaDaTela';
import { useAnaliseDeCredito, type EstadoDaFila, type EstadoDoPainel } from './useAnaliseDeCredito';

type Id = 'fila' | 'cliente';

/** Tamanhos de estreia, usados so na primeira vez: a fila larga o bastante para
 *  a tabela, e a ficha por cima dela, encostada a direita. Depois disso vale o
 *  que o usuario deixou — cada janela lembra o proprio canto. */
const ABERTURA_DA_FILA = (area: Area) => aoAbrir(area, 0.62, 0.9, 'esquerda');
const ABERTURA_DO_CLIENTE = (area: Area) => aoAbrir(area, 0.72, 0.94, 'direita');

const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]';

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
  zIndex,
  ativa,
  aoRecarregar,
  aoEscolher,
  aoAlternarImpressao,
  aoFechar,
  aoFocar,
}: {
  readonly fila: EstadoDaFila;
  readonly zIndex: number;
  readonly ativa: boolean;
  readonly aoRecarregar: () => void;
  readonly aoEscolher: (linha: PedidoNaFila) => void;
  readonly aoAlternarImpressao: (linha: PedidoNaFila) => void;
  readonly aoFechar: () => void;
  readonly aoFocar: () => void;
}) {
  return (
    <Janela
      id="analise-de-credito.fila"
      titulo="Fila de pedidos"
      subtitulo="Aguardando análise"
      abertura={ABERTURA_DA_FILA}
      zIndex={zIndex}
      ativa={ativa}
      aoFechar={aoFechar}
      aoFocar={aoFocar}
      acoes={
        <button type="button" onClick={aoRecarregar} className={BOTAO_CLARO}>
          <RotateCw size={14} aria-hidden="true" /> Atualizar
        </button>
      }
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

function JanelaDoCliente({
  nome,
  painel,
  aba,
  onTrocarAba,
  abertos,
  onAlternar,
  zIndex,
  ativa,
  aoAtualizar,
  aoVerFila,
  aoFechar,
  aoFocar,
}: {
  readonly nome: string;
  readonly painel: EstadoDoPainel;
  readonly aba: AbaDoHistorico;
  readonly onTrocarAba: (aba: AbaDoHistorico) => void;
  readonly abertos: ReadonlySet<string>;
  readonly onAlternar: (id: string) => void;
  readonly zIndex: number;
  readonly ativa: boolean;
  readonly aoAtualizar: () => void;
  readonly aoVerFila: () => void;
  readonly aoFechar: () => void;
  readonly aoFocar: () => void;
}) {
  return (
    <Janela
      id="analise-de-credito.cliente"
      titulo={nome}
      subtitulo="Análise de crédito do cliente"
      abertura={ABERTURA_DO_CLIENTE}
      zIndex={zIndex}
      ativa={ativa}
      aoFechar={aoFechar}
      aoFocar={aoFocar}
      acoes={
        <>
          <button type="button" onClick={aoAtualizar} className={BOTAO_CLARO}>
            <RotateCw size={14} aria-hidden="true" /> Atualizar
          </button>
          <button type="button" onClick={aoVerFila} className={BOTAO_CLARO}>
            <ListChecks size={14} aria-hidden="true" /> Fila
          </button>
        </>
      }
    >
      <FichaDoCliente
        painel={painel}
        aba={aba}
        onTrocarAba={onTrocarAba}
        abertos={abertos}
        onAlternar={onAlternar}
      />
    </Janela>
  );
}

export function AnaliseDeCreditoScreen() {
  const { fila, painel, carregarFila, abrirCliente, alternarImpressao } = useAnaliseDeCredito();
  const { area } = useAreaDaTela();
  // A ordem e a profundidade: a ultima da lista fica na frente.
  const [ordem, setOrdem] = useState<readonly Id[]>(['fila']);
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null);
  const [aba, setAba] = useState<AbaDoHistorico>('pedidos');
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());

  const focar = useCallback(
    (id: Id) => setOrdem((atual) => [...atual.filter((outro) => outro !== id), id]),
    [],
  );
  const fechar = useCallback(
    (id: Id) => setOrdem((atual) => atual.filter((outro) => outro !== id)),
    [],
  );

  const escolher = useCallback(
    ({ pedido }: PedidoNaFila) => {
      setCliente({ id: pedido.customerId, nome: pedido.clienteNome });
      // O pedido escolhido ja abre detalhado: foi por ele que o analista entrou.
      setAbertos(new Set([pedido.id]));
      void abrirCliente(pedido.customerId);
      // A ficha sempre sobe: ela e a resposta ao clique, e nao pode nascer atras.
      focar('cliente');
    },
    [abrirCliente, focar],
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
    if (cliente) void abrirCliente(cliente.id);
  }, [carregarFila, abrirCliente, cliente]);

  const profundidade = (id: Id) => 40 + Math.max(0, ordem.indexOf(id));

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
          zIndex={profundidade('fila')}
          ativa={ordem.at(-1) === 'fila'}
          aoRecarregar={() => void carregarFila()}
          aoEscolher={escolher}
          aoAlternarImpressao={(linha) => void alternarImpressao(linha.pedido.id, !linha.impresso)}
          aoFechar={() => fechar('fila')}
          aoFocar={() => focar('fila')}
        />
      )}

      {ordem.includes('cliente') && cliente && (
        <JanelaDoCliente
          nome={cliente.nome}
          painel={painel}
          aba={aba}
          onTrocarAba={setAba}
          abertos={abertos}
          onAlternar={alternar}
          zIndex={profundidade('cliente')}
          ativa={ordem.at(-1) === 'cliente'}
          aoAtualizar={atualizar}
          aoVerFila={() => focar('fila')}
          aoFechar={() => fechar('cliente')}
          aoFocar={() => focar('cliente')}
        />
      )}
    </>
  );
}
