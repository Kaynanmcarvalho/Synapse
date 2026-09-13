import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { ListChecks, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmarLiberacao } from './ConfirmarLiberacao';
import { FichaDoCliente, type PropsDaFicha } from './FichaDoCliente';
import type { AbaDoHistorico } from './HistoricoDoCliente';
import { JanelaDeAnalise } from './analise/JanelaDeAnalise';
import { GavetaDoCliente } from './cadastro/GavetaDoCliente';
import { JanelaDoCadastro } from './cadastro/JanelaDoCadastro';
import { JanelaDeDocumentos } from './documentos/JanelaDeDocumentos';
import { useCaminhoDeDocumentos } from './documentos/useCaminhoDeDocumentos';
import { Janela } from './janela/Janela';
import { aoAbrir, type Area } from './janela/geometria';
import type { ControleDaPilha, Pilha } from './pilha';
import { BOTAO_CLARO } from './ui/Superficies';
import type { EstadoDoPainel } from './useAnaliseDeCredito';
import { useFichaDoCliente } from './useFichaDoCliente';

const ABERTURA_DO_CLIENTE = (area: Area) => aoAbrir(area, 0.72, 0.94, 'direita');

/** O cliente escolhido na fila, com o pedido que o trouxe — esse ja chega
 *  marcado para aprovar. `escolhidoEm` separa duas escolhas do mesmo pedido. */
export interface ClienteEscolhido {
  readonly id: string;
  readonly nome: string;
  readonly pedidoInicial: string;
  readonly escolhidoEm: number;
}

function JanelaDoCliente({
  nome,
  ficha,
  aoAtualizar,
  aoVerFila,
  ...pilha
}: Pilha & {
  readonly nome: string;
  readonly ficha: PropsDaFicha;
  readonly aoAtualizar: () => void;
  readonly aoVerFila: () => void;
}) {
  return (
    <Janela
      id="analise-de-credito.cliente"
      titulo={nome}
      subtitulo="Análise de crédito do cliente"
      abertura={ABERTURA_DO_CLIENTE}
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
      {...pilha}
    >
      <FichaDoCliente {...ficha} />
    </Janela>
  );
}

type Ficha = ReturnType<typeof useFichaDoCliente>;
type Documentos = ReturnType<typeof useCaminhoDeDocumentos>;

/** Gaveta do cadastro e confirmacao da aprovacao em lote: o que abre por cima
 *  de tudo e fecha com Esc. */
function Sobreposicoes({
  dados,
  nome,
  ficha,
  gaveta,
  confirmando,
  aoFecharGaveta,
  aoAbrirCadastroCompleto,
  aoFecharConfirmacao,
}: {
  readonly dados: PainelDeAnaliseDeCredito | null;
  readonly nome: string;
  readonly ficha: Ficha;
  readonly gaveta: boolean;
  readonly confirmando: boolean;
  readonly aoFecharGaveta: () => void;
  readonly aoAbrirCadastroCompleto: () => void;
  readonly aoFecharConfirmacao: () => void;
}) {
  if (!dados) return null;
  return (
    <>
      {gaveta && (
        <GavetaDoCliente
          nome={nome}
          cadastro={dados.cadastro}
          situacao={dados.situacao}
          aoAbrirCompleto={aoAbrirCadastroCompleto}
          aoFechar={aoFecharGaveta}
        />
      )}
      {confirmando && ficha.lote.itens.length > 0 && (
        <ConfirmarLiberacao
          cliente={nome}
          pedidos={dados.pedidosEmAnalise.filter((pedido) => ficha.selecionados.has(pedido.id))}
          avaliacoes={dados.avaliacoes}
          lote={ficha.lote}
          aoCancelar={aoFecharConfirmacao}
          aoConfirmar={(justificativa) => {
            aoFecharConfirmacao();
            void ficha.liberar(justificativa);
          }}
        />
      )}
    </>
  );
}

/** A analise do pedido e o navegador de documentos, cada um na sua janela. */
function JanelasDeDetalhe({
  dados,
  ficha,
  documentos,
  janelas,
  aoAbrirGaveta,
}: {
  readonly dados: PainelDeAnaliseDeCredito | null;
  readonly ficha: Ficha;
  readonly documentos: Documentos;
  readonly janelas: ControleDaPilha;
  readonly aoAbrirGaveta: () => void;
}) {
  const { aberta, focar, fechar, pilha } = janelas;
  const analisado = ficha.pedidoEmAnalise;
  return (
    <>
      {aberta('analise') && dados && analisado && (
        <JanelaDeAnalise
          painel={dados}
          pedido={analisado}
          aoObservar={ficha.observar}
          aoAbrirCadastro={aoAbrirGaveta}
          aoDecidir={(resultado, acao) => {
            ficha.aoDecidir(resultado, acao);
            fechar('analise');
            focar('cliente');
          }}
          {...pilha('analise')}
        />
      )}
      {aberta('documentos') && documentos.caminho.length > 0 && (
        <JanelaDeDocumentos
          caminho={documentos.caminho}
          aoSeguir={documentos.seguir}
          aoVoltar={documentos.voltar}
          aoIrPara={documentos.irPara}
          {...pilha('documentos')}
        />
      )}
    </>
  );
}

/** As props da ficha: o que cada clique da ficha abre ou muda. */
const montarFicha = ({
  painel,
  aba,
  aoTrocarAba,
  ficha,
  documentos,
  focar,
  aoConfirmar,
  aoAbrirGaveta,
}: {
  readonly painel: EstadoDoPainel;
  readonly aba: AbaDoHistorico;
  readonly aoTrocarAba: (aba: AbaDoHistorico) => void;
  readonly ficha: Ficha;
  readonly documentos: Documentos;
  readonly focar: ControleDaPilha['focar'];
  readonly aoConfirmar: () => void;
  readonly aoAbrirGaveta: () => void;
}): PropsDaFicha => ({
  painel,
  aba,
  onTrocarAba: aoTrocarAba,
  selecionados: ficha.selecionados,
  lote: ficha.lote,
  aoAlternarSelecao: ficha.alternarSelecao,
  aoSelecionarTodos: ficha.selecionarTodos,
  aoAbrirAnalise: (pedido) => {
    ficha.abrirAnalise(pedido);
    focar('analise');
  },
  aoAbrirDocumento: (documento) => {
    documentos.abrir(documento);
    focar('documentos');
  },
  aoLiberar: aoConfirmar,
  liberando: ficha.liberando,
  resultado: ficha.resultado,
  aoFecharResultado: ficha.fecharResultado,
  aoAbrirCadastro: aoAbrirGaveta,
});

/** Tudo que abre a partir do cliente escolhido: a ficha, a analise do pedido,
 *  o navegador de documentos, a gaveta do cadastro, o cadastro completo e a
 *  confirmacao da aprovacao em lote. Cada coisa na sua janela. */
export function CamadaDoCliente({
  cliente,
  painel,
  janelas,
  recarregar,
}: {
  readonly cliente: ClienteEscolhido;
  readonly painel: EstadoDoPainel;
  readonly janelas: ControleDaPilha;
  readonly recarregar: () => void;
}) {
  const dados = painel.status === 'pronto' ? painel.dados : null;
  const ficha = useFichaDoCliente(dados, recarregar);
  const documentos = useCaminhoDeDocumentos();
  const [aba, setAba] = useState<AbaDoHistorico>('pedidos');
  const [confirmando, setConfirmando] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const { aberta, focar, pilha } = janelas;
  const { setSelecionados } = ficha;
  const nome = dados?.cliente.nome ?? cliente.nome;

  // Cada escolha na fila reinicia a marcacao com o pedido que trouxe o cliente.
  useEffect(
    () => setSelecionados(new Set([cliente.pedidoInicial])),
    [cliente.pedidoInicial, cliente.escolhidoEm, setSelecionados],
  );

  const abrirCadastroCompleto = useCallback(() => {
    setGaveta(false);
    focar('cadastro');
  }, [focar]);

  const propsDaFicha = montarFicha({
    painel,
    aba,
    aoTrocarAba: setAba,
    ficha,
    documentos,
    focar,
    aoConfirmar: () => setConfirmando(true),
    aoAbrirGaveta: () => setGaveta(true),
  });

  return (
    <>
      {aberta('cliente') && (
        <JanelaDoCliente
          nome={nome}
          aoAtualizar={recarregar}
          aoVerFila={() => focar('fila')}
          ficha={propsDaFicha}
          {...pilha('cliente')}
        />
      )}
      <JanelasDeDetalhe
        dados={dados}
        ficha={ficha}
        documentos={documentos}
        janelas={janelas}
        aoAbrirGaveta={() => setGaveta(true)}
      />
      {aberta('cadastro') && (
        <JanelaDoCadastro
          customerId={cliente.id}
          nome={nome}
          aoSalvar={recarregar}
          {...pilha('cadastro')}
        />
      )}
      <Sobreposicoes
        dados={dados}
        nome={nome}
        ficha={ficha}
        gaveta={gaveta}
        confirmando={confirmando}
        aoFecharGaveta={() => setGaveta(false)}
        aoAbrirCadastroCompleto={abrirCadastroCompleto}
        aoFecharConfirmacao={() => setConfirmando(false)}
      />
    </>
  );
}
