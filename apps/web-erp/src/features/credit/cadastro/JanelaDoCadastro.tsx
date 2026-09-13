import type { CadastroDoCliente } from '@synapse/types';
import { Janela } from '../janela/Janela';
import { aoAbrir, type Area } from '../janela/geometria';
import type { Pilha } from '../pilha';
import { FormularioDoCadastro } from './FormularioDoCadastro';

const ABERTURA = (area: Area) => aoAbrir(area, 0.52, 0.88, 'centro');

/** O cadastro completo do cliente, para editar. As alteracoes ficam assinadas. */
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
      abertura={ABERTURA}
      {...pilha}
    >
      <FormularioDoCadastro customerId={customerId} aoSalvar={aoSalvar} />
    </Janela>
  );
}
