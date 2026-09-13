import { ListChecks, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmarLiberacao } from './ConfirmarLiberacao';
import { FichaDoCliente, type PropsDaFicha } from './FichaDoCliente';
import type { AbaDoHistorico } from './HistoricoDoCliente';
import { JanelaDeParcelas, JanelaDoCadastro, JanelaDoPedido } from './JanelasDoPedido';
import { Janela } from './janela/Janela';
import { aoAbrir, type Area } from './janela/geometria';
import type { ControleDaPilha, Pilha } from './pilha';
import type { EstadoDoPainel } from './useAnaliseDeCredito';
import { useFichaDoCliente } from './useFichaDoCliente';

const ABERTURA_DO_CLIENTE = (area: Area) => aoAbrir(area, 0.72, 0.94, 'direita');

const BOTAO_CLARO =
  'bg-surface-soft text-button-sm text-ink inline-flex h-9 items-center gap-2 rounded-full px-4 transition hover:bg-[#ececee]';

/** O cliente escolhido na fila, com o pedido que o trouxe — esse ja chega
 *  marcado para liberar. `escolhidoEm` separa duas escolhas do mesmo pedido. */
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

/** O que a camada le do painel, em um lugar so: nome atualizado (o cadastro
 *  pode ter mudado), carteira para as parcelas e os pedidos marcados. */
const lerPainel = (
  painel: EstadoDoPainel,
  cliente: ClienteEscolhido,
  selecionados: ReadonlySet<string>,
) => {
  const dados = painel.status === 'pronto' ? painel.dados : null;
  return {
    dados,
    nome: dados?.cliente.nome ?? cliente.nome,
    carteira: dados?.carteira ?? null,
    marcados: (dados?.pedidosEmAnalise ?? []).filter((pedido) => selecionados.has(pedido.id)),
  };
};

/** Tudo que abre a partir do cliente escolhido: a ficha, o pedido por cima dela,
 *  as parcelas por cima do pedido, o cadastro e a confirmacao da liberacao. */
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
  const ficha = useFichaDoCliente(painel.status === 'pronto' ? painel.dados : null, recarregar);
  const [aba, setAba] = useState<AbaDoHistorico>('pedidos');
  const [confirmando, setConfirmando] = useState(false);
  const { aberta, focar, pilha } = janelas;
  const { setSelecionados } = ficha;
  const { nome, carteira, marcados } = lerPainel(painel, cliente, ficha.selecionados);
  const aberto = ficha.pedidoAberto;

  // Cada escolha na fila reinicia a marcacao com o pedido que trouxe o cliente.
  useEffect(
    () => setSelecionados(new Set([cliente.pedidoInicial])),
    [cliente.pedidoInicial, cliente.escolhidoEm, setSelecionados],
  );

  return (
    <>
      {aberta('cliente') && (
        <JanelaDoCliente
          nome={nome}
          aoAtualizar={recarregar}
          aoVerFila={() => focar('fila')}
          ficha={{
            painel,
            aba,
            onTrocarAba: setAba,
            selecionados: ficha.selecionados,
            aoAlternarSelecao: ficha.alternarSelecao,
            aoSelecionarTodos: ficha.selecionarTodos,
            aoAbrirPedido: (alvo) => void ficha.abrirPedido(alvo).then(() => focar('pedido')),
            aoLiberar: () => setConfirmando(true),
            liberando: ficha.liberando,
            resultado: ficha.resultado,
            aoFecharResultado: ficha.fecharResultado,
            aoAbrirCadastro: () => focar('cadastro'),
          }}
          {...pilha('cliente')}
        />
      )}
      {aberta('pedido') && aberto && (
        <JanelaDoPedido
          pedido={aberto}
          carteira={carteira}
          aoVerParcelas={() => focar('parcelas')}
          aoAbrirCadastro={() => focar('cadastro')}
          aoObservar={ficha.observar}
          {...pilha('pedido')}
        />
      )}
      {aberta('parcelas') && aberto && (
        <JanelaDeParcelas pedido={aberto} carteira={carteira} {...pilha('parcelas')} />
      )}
      {aberta('cadastro') && (
        <JanelaDoCadastro
          customerId={cliente.id}
          nome={nome}
          aoSalvar={recarregar}
          {...pilha('cadastro')}
        />
      )}
      {confirmando && marcados.length > 0 && (
        <ConfirmarLiberacao
          cliente={nome}
          pedidos={marcados}
          aoCancelar={() => setConfirmando(false)}
          aoConfirmar={() => {
            setConfirmando(false);
            void ficha.liberar();
          }}
        />
      )}
    </>
  );
}
