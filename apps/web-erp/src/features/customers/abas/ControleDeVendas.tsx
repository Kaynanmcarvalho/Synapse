import { LinhaDeCampos, Secao } from '../../../components/formulario/Formulario';
import type { PropsDaAba } from './aba';
import { CampoDeTexto } from './CampoDoFormulario';

/** Aba Controle de Vendas: como este cliente costuma comprar.
 *
 *  Estes três campos ficam registrados no cadastro, mas o lançamento de pedido
 *  ainda não os aplica — e a tela diz isso, em vez de prometer uma regra que
 *  não existe. Os campos com efeito no crédito (limite, dias para bloqueio,
 *  autorização de pagamento) estão na aba Principal, como no Syndata.
 *
 *  Fase 6.2: migrado para `Secao`/`LinhaDeCampos`/`CampoDeTexto`. Os três
 *  campos são opcionais no `clienteSchema` (`controleDeVendas` inteiro tem
 *  default) — nenhum `obrigatorio`. */

const CONDICOES = ['À vista', '7', '14/21', '28/35/42', '30/60/90'];
const FORMAS = ['Boleto', 'PIX', 'Dinheiro', 'Cartão de crédito', 'Cheque', 'Carteira'];

const AINDA_NAO_APLICADO = 'Registrado. O lançamento de pedido ainda não usa este valor.';

export function AbaControleDeVendas(props: PropsDaAba) {
  const { erros } = props;
  return (
    <div className="grid gap-4">
      <Secao titulo="Condição habitual" descricao="Como este cliente costuma comprar">
        <LinhaDeCampos>
          <CampoDeTexto
            aba={props}
            campo="condicaoPadrao"
            rotulo="Condição de pagamento padrão"
            dica={AINDA_NAO_APLICADO}
            maxLength={120}
            sugestoes={CONDICOES}
            larguraSemantica="medio"
          />
          <CampoDeTexto
            aba={props}
            campo="formaPadrao"
            rotulo="Forma de pagamento padrão"
            dica={AINDA_NAO_APLICADO}
            maxLength={60}
            sugestoes={FORMAS}
            larguraSemantica="medio"
          />
          <CampoDeTexto
            aba={props}
            campo="descontoMaximo"
            rotulo="Desconto máximo (%)"
            dica={erros.descontoMaximo ? undefined : AINDA_NAO_APLICADO}
            inputMode="decimal"
            alinharADireita
            mascara={(valor) => valor.replace(/[^0-9.]/g, '')}
            larguraSemantica="curto"
          />
        </LinhaDeCampos>
      </Secao>

      <Secao titulo="Crédito" descricao="Limite, bloqueio e autorização ficam na aba Principal">
        <p className="text-body-sm text-stone">
          Limite a prazo, dias para bloqueio, situação e autorização de pagamento ficam na aba
          Principal. Os quatro são lidos pela análise de crédito.
        </p>
      </Secao>
    </div>
  );
}
