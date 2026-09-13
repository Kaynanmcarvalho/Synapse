import type { PedidoDeVenda } from '@synapse/types';
import { ListChecks, RotateCw, UserSearch } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ConteudoDaFila } from './FilaDeAnalise';
import { FichaDoCliente } from './FichaDoCliente';
import type { AbaDoHistorico } from './HistoricoDoCliente';
import { Janela } from './janela/Janela';
import { aoAbrir, type Area } from './janela/geometria';
import { useAreaDaTela } from './janela/useAreaDaTela';
import { useAnaliseDeCredito, type EstadoDaFila, type EstadoDoPainel } from './useAnaliseDeCredito';

type Id = 'fila' | 'cliente';

/** A fila fica encostada a esquerda e a ficha ocupa o resto: as duas cabem
 *  abertas ao mesmo tempo, que e o jeito de voltar para a lista sem fechar
 *  nada. Dai em diante quem manda e o mouse — arrastar, esticar, maximizar. */
const ABERTURA_DA_FILA = (area: Area) => aoAbrir(area, 0.3, 0.88, 'esquerda');
const ABERTURA_DO_CLIENTE = (area: Area) => aoAbrir(area, 0.68, 0.94, 'direita');

const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]';
const BOTAO_ESCURO =
  'bg-canvas-dark text-button-sm hover:bg-charcoal inline-flex h-11 items-center gap-2 rounded-full px-6 text-white transition';

function Fundo({
  aoAbrirFila,
  aoAbrirCliente,
}: {
  readonly aoAbrirFila: () => void;
  readonly aoAbrirCliente: (() => void) | null;
}) {
  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-12 sm:px-6">
      <h1 className="font-display text-heading-lg text-ink">Análise de crédito</h1>
      <p className="text-body-md text-mute mt-3">
        Todo pedido enviado pelos vendedores — do desktop ou do celular — espera aqui a liberação do
        financeiro. A fila e a ficha do cliente abrem em janelas: arraste pela barra de título,
        estique pelas laterais ou pelo pé, e dê dois cliques no título para ocupar a tela inteira.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={aoAbrirFila} className={BOTAO_ESCURO}>
          <ListChecks size={17} aria-hidden="true" /> Fila de pedidos
        </button>
        {aoAbrirCliente && (
          <button
            type="button"
            onClick={aoAbrirCliente}
            className={`${BOTAO_CLARO} h-11 px-6 text-[15px]`}
          >
            <UserSearch size={17} aria-hidden="true" /> Ficha do cliente
          </button>
        )}
      </div>
    </main>
  );
}

/** So escurece o que esta atras das janelas: o menu do sistema continua
 *  clicavel, e por isso a cortina comeca abaixo do cabecalho. */
function Cortina({ topo }: { readonly topo: number }) {
  return (
    <div
      aria-hidden="true"
      className="bg-canvas-dark/10 pointer-events-none fixed inset-x-0 bottom-0 z-30"
      style={{ top: topo }}
    />
  );
}

function JanelaDaFila({
  fila,
  clienteSelecionado,
  zIndex,
  ativa,
  aoRecarregar,
  aoEscolher,
  aoFechar,
  aoFocar,
}: {
  readonly fila: EstadoDaFila;
  readonly clienteSelecionado: string | null;
  readonly zIndex: number;
  readonly ativa: boolean;
  readonly aoRecarregar: () => void;
  readonly aoEscolher: (pedido: PedidoDeVenda) => void;
  readonly aoFechar: () => void;
  readonly aoFocar: () => void;
}) {
  return (
    <Janela
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
        pedidos={fila.status === 'pronto' ? fila.pedidos : []}
        carregando={fila.status === 'carregando'}
        erro={fila.status === 'erro' ? fila.mensagem : null}
        clienteSelecionado={clienteSelecionado}
        onEscolher={aoEscolher}
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
  const { fila, painel, carregarFila, abrirCliente } = useAnaliseDeCredito();
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
    (pedido: PedidoDeVenda) => {
      setCliente({ id: pedido.customerId, nome: pedido.clienteNome });
      // O pedido escolhido ja abre detalhado: foi por ele que o analista entrou.
      setAbertos(new Set([pedido.id]));
      void abrirCliente(pedido.customerId);
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
        aoAbrirFila={() => focar('fila')}
        aoAbrirCliente={cliente ? () => focar('cliente') : null}
      />

      {ordem.length > 0 && <Cortina topo={area.topo} />}

      {ordem.includes('fila') && (
        <JanelaDaFila
          fila={fila}
          clienteSelecionado={cliente?.id ?? null}
          zIndex={profundidade('fila')}
          ativa={ordem.at(-1) === 'fila'}
          aoRecarregar={() => void carregarFila()}
          aoEscolher={escolher}
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
