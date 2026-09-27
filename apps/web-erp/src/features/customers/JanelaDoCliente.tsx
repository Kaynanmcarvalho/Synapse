import type { Customer } from '@synapse/types';
import { Modal } from '@synapse/ui';
import { LoaderCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Abas, PainelDeAba } from '../../components/formulario/Formulario';
import { AbaControleDeVendas } from './abas/ControleDeVendas';
import { AbaDocumentos } from './abas/Documentos';
import { AbaOutrasInformacoes } from './abas/OutrasInformacoes';
import { AbaPessoaJuridica } from './abas/PessoaJuridica';
import { AbaPrincipal } from './abas/Principal';
import { AbaReferencias } from './abas/Referencias';
import { AbaRelatorios } from './abas/Relatorios';
import type { PropsDaAba } from './abas/aba';
import { ABAS, abasComErro, type Aba } from './janela';
import { Cabecalho, Rodape } from './JanelaPartes';
import { useAtalhosDoCadastro } from './useAtalhosDoCadastro';
import { useCadastroDeCliente, type EstadoDaCarga } from './useCadastroDeCliente';
import { useVisaoDeCredito, type VisaoDeCredito } from './useVisaoDeCredito';

/** A janela do cadastro de clientes: as abas do Syndata, no desenho do Synapse.
 *
 *  F2 salva, F3 desfaz o que foi digitado, Esc sai. Sair com alteração pendente
 *  pergunta antes — perder meia hora de digitação por um Esc sem querer é o
 *  tipo de coisa que não se desfaz.
 *
 *  Cabeçalho e rodapé ficam brancos e fixos; o miolo rola sobre um fundo
 *  cinza, e é esse contraste que faz as seções das abas saltarem. A altura é
 *  fixa para a janela não pular de tamanho a cada troca de aba.
 *
 *  Fase 6.1: as abas eram uma pílula própria (mesmo desenho de
 *  `JanelaDeCadastro`, duplicado). Passam a usar `Abas`/`PainelDeAba` da Form
 *  Grammar (Fase 6) — sublinhado cobalto, ArrowLeft/Right, `aria-controls` —
 *  segundo consumidor real depois do assistente fiscal. O aviso de "aba com
 *  erro" (que a pílula já tinha) virou uma capacidade da própria `Abas`. */

const ID_BASE = 'cadastro-cliente';
const ABAS_DA_JANELA = ABAS.map(([id, rotulo]) => ({ id, rotulo }));

function Corpo({
  carga,
  aba,
  props,
  visao,
  aoAbrirCredito,
}: {
  readonly carga: EstadoDaCarga;
  readonly aba: Aba;
  readonly props: PropsDaAba;
  readonly visao: VisaoDeCredito;
  readonly aoAbrirCredito: (id: string) => void;
}) {
  if (carga.status === 'carregando') {
    return (
      <p
        role="status"
        className="text-body-sm text-stone flex items-center justify-center gap-2 py-16"
      >
        <LoaderCircle
          size={16}
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
        />
        Carregando cadastro…
      </p>
    );
  }
  if (carga.status === 'erro') {
    return <p className="text-body-sm py-16 text-center text-[#b3242f]">{carga.mensagem}</p>;
  }
  if (aba === 'pessoa-juridica') return <AbaPessoaJuridica {...props} />;
  if (aba === 'referencias') return <AbaReferencias {...props} />;
  if (aba === 'controle-de-vendas') return <AbaControleDeVendas {...props} />;
  if (aba === 'outras-informacoes') return <AbaOutrasInformacoes {...props} />;
  if (aba === 'documentos') return <AbaDocumentos {...props} visao={visao} />;
  if (aba === 'relatorios') {
    return <AbaRelatorios {...props} visao={visao} aoAbrirCredito={aoAbrirCredito} />;
  }
  return <AbaPrincipal {...props} />;
}

const nada = () => undefined;

// eslint-disable-next-line max-lines-per-function -- composição da janela inteira (cabeçalho, abas, corpo, rodapé); quebrar mais perderia a visão do fluxo.
export function JanelaDoCliente({
  clienteId,
  aoFechar,
  aoSalvar,
  aoAbrirCredito,
}: {
  /** Nulo abre em cadastro novo. */
  readonly clienteId: string | null;
  readonly aoFechar: () => void;
  readonly aoSalvar?: (cliente: Customer) => void;
  readonly aoAbrirCredito?: (customerId: string) => void;
}) {
  const cadastro = useCadastroDeCliente(clienteId);
  const visao = useVisaoDeCredito(cadastro.cliente?.id ?? null);
  const [aba, setAba] = useState<Aba>('principal');
  const { salvar: gravar, limpar, alterado } = cadastro;

  const salvar = useCallback(async () => {
    const resultado = await gravar();
    if (resultado.ok) aoSalvar?.(resultado.cliente);
    else if (resultado.aba) setAba(resultado.aba as Aba);
  }, [gravar, aoSalvar]);

  const salvarPeloTeclado = useCallback(() => void salvar(), [salvar]);

  const sair = useCallback(() => {
    if (alterado && !window.confirm('Sair sem salvar? O que foi digitado se perde.')) return;
    aoFechar();
  }, [alterado, aoFechar]);

  useAtalhosDoCadastro(salvarPeloTeclado, limpar);

  const props: PropsDaAba = {
    formulario: cadastro.formulario,
    mudar: cadastro.mudar,
    erros: cadastro.erros,
    sugestoes: cadastro.sugestoes,
    vendedores: cadastro.vendedores,
    cliente: cadastro.cliente,
  };

  return (
    <Modal
      onClose={sair}
      label="Cadastro de clientes"
      size="full"
      bare
      closeOnBackdrop={false}
      // Fase 6.1: `size="full"` do Modal para em max-w-6xl (1152px) — um
      // cadastro com 7 abas, lookups e várias seções minguava no meio de uma
      // tela 1920 (havia mais espaço fora do modal do que dentro). Isto o
      // deixa usar a largura de workspace sem virar edge-to-edge.
      className="sm:h-[88vh] sm:w-[94vw] sm:max-w-[1600px]"
    >
      <Cabecalho cliente={cadastro.cliente} aoSair={sair} />
      <div className="border-hairline-light border-b bg-white px-6 py-3">
        <Abas
          idBase={ID_BASE}
          abas={ABAS_DA_JANELA}
          ativa={aba}
          aoMudar={setAba}
          rotulo="Cadastro de clientes"
          comErro={abasComErro(cadastro.erros)}
        />
      </div>
      <div className="bg-surface-soft min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {/* A chave refaz a entrada a cada aba: um esmaecer curto, e não um salto. */}
        <div key={aba} className="animate-revelar motion-reduce:animate-none">
          <PainelDeAba idBase={ID_BASE} ativa={aba}>
            <Corpo
              carga={cadastro.carga}
              aba={aba}
              props={props}
              visao={visao}
              aoAbrirCredito={aoAbrirCredito ?? nada}
            />
          </PainelDeAba>
        </div>
      </div>
      <Rodape
        erro={cadastro.erroAoSalvar}
        alterado={alterado}
        salvo={Boolean(cadastro.cliente)}
        salvando={cadastro.salvando}
        carregando={cadastro.carga.status === 'carregando'}
        aoLimpar={limpar}
        aoSair={sair}
        aoSalvar={salvarPeloTeclado}
      />
    </Modal>
  );
}
