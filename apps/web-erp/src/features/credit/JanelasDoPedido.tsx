import type { CadastroDoCliente, CarteiraDoCliente, PedidoDeVenda } from '@synapse/types';
import { ROTULO_DA_SITUACAO, ROTULO_DO_TIPO } from './analise';
import { FormularioDoCadastro } from './cadastro/FormularioDoCadastro';
import { Janela } from './janela/Janela';
import { aoAbrir, type Area } from './janela/geometria';
import { ConteudoDasParcelas } from './pedido/ConteudoDasParcelas';
import { ConteudoDoPedido } from './pedido/ConteudoDoPedido';

/** Tamanhos de estreia das janelas que abrem por cima da ficha. Depois disso
 *  cada uma lembra onde o usuario a deixou. */
const ABERTURA_DO_PEDIDO = (area: Area) => aoAbrir(area, 0.58, 0.88, 'centro');
const ABERTURA_DAS_PARCELAS = (area: Area) => aoAbrir(area, 0.38, 0.64, 'direita');
const ABERTURA_DO_CADASTRO = (area: Area) => aoAbrir(area, 0.52, 0.88, 'centro');

interface Pilha {
  readonly zIndex: number;
  readonly ativa: boolean;
  readonly aoFechar: () => void;
  readonly aoFocar: () => void;
}

export function JanelaDoPedido({
  pedido,
  carteira,
  aoVerParcelas,
  aoAbrirCadastro,
  aoObservar,
  ...pilha
}: Pilha & {
  readonly pedido: PedidoDeVenda;
  readonly carteira: CarteiraDoCliente | null;
  readonly aoVerParcelas: () => void;
  readonly aoAbrirCadastro: () => void;
  readonly aoObservar: (texto: string) => Promise<void>;
}) {
  return (
    <Janela
      id="analise-de-credito.pedido"
      titulo={`Pedido ${pedido.numero} · ${pedido.clienteNome}`}
      subtitulo={`${ROTULO_DO_TIPO[pedido.tipo]} · ${ROTULO_DA_SITUACAO[pedido.situacao]}`}
      abertura={ABERTURA_DO_PEDIDO}
      {...pilha}
    >
      <ConteudoDoPedido
        pedido={pedido}
        carteira={carteira}
        aoVerParcelas={aoVerParcelas}
        aoAbrirCadastro={aoAbrirCadastro}
        aoObservar={aoObservar}
      />
    </Janela>
  );
}

export function JanelaDeParcelas({
  pedido,
  carteira,
  ...pilha
}: Pilha & {
  readonly pedido: PedidoDeVenda;
  readonly carteira: CarteiraDoCliente | null;
}) {
  return (
    <Janela
      id="analise-de-credito.parcelas"
      titulo={`Parcelas do pedido ${pedido.numero}`}
      subtitulo="Vencimentos contados a partir de hoje"
      abertura={ABERTURA_DAS_PARCELAS}
      {...pilha}
    >
      <ConteudoDasParcelas pedido={pedido} carteira={carteira} />
    </Janela>
  );
}

export function JanelaDoCadastro({
  customerId,
  nome,
  aoSalvar,
  ...pilha
}: Pilha & {
  readonly customerId: string;
  readonly nome: string;
  readonly aoSalvar: (cadastro: CadastroDoCliente) => void;
}) {
  return (
    <Janela
      id="analise-de-credito.cadastro"
      titulo={`Cadastro · ${nome}`}
      subtitulo="As alterações ficam registradas com o seu nome"
      abertura={ABERTURA_DO_CADASTRO}
      {...pilha}
    >
      <FormularioDoCadastro customerId={customerId} aoSalvar={aoSalvar} />
    </Janela>
  );
}
