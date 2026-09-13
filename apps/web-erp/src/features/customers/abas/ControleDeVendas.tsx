import { Bloco, Campo, Grade, Texto } from '../campos';
import type { PropsDaAba } from './aba';

/** Aba Controle de Vendas: como este cliente costuma comprar.
 *
 *  Estes três campos ficam registrados no cadastro, mas o lançamento de pedido
 *  ainda não os aplica — e a tela diz isso, em vez de prometer uma regra que
 *  não existe. Os campos com efeito no crédito (limite, dias para bloqueio,
 *  autorização de pagamento) estão na aba Principal, como no Syndata. */

const CONDICOES = ['À vista', '7', '14/21', '28/35/42', '30/60/90'];
const FORMAS = ['Boleto', 'PIX', 'Dinheiro', 'Cartão de crédito', 'Cheque', 'Carteira'];

const AINDA_NAO_APLICADO = 'Registrado. O lançamento de pedido ainda não usa este valor.';

export function AbaControleDeVendas({ formulario, mudar, erros }: PropsDaAba) {
  return (
    <div className="grid gap-3">
      <Bloco titulo="Condição habitual">
        <Grade colunas={3}>
          <Campo rotulo="Condição de pagamento padrão" dica={AINDA_NAO_APLICADO}>
            {({ id }) => (
              <Texto
                id={id}
                valor={formulario.condicaoPadrao}
                maxLength={120}
                sugestoes={CONDICOES}
                aoMudar={(valor) => mudar('condicaoPadrao', valor)}
              />
            )}
          </Campo>
          <Campo rotulo="Forma de pagamento padrão" dica={AINDA_NAO_APLICADO}>
            {({ id }) => (
              <Texto
                id={id}
                valor={formulario.formaPadrao}
                maxLength={60}
                sugestoes={FORMAS}
                aoMudar={(valor) => mudar('formaPadrao', valor)}
              />
            )}
          </Campo>
          <Campo
            rotulo="Desconto máximo (%)"
            dica={erros.descontoMaximo ? undefined : AINDA_NAO_APLICADO}
            erro={erros.descontoMaximo ?? null}
          >
            {({ id, invalido }) => (
              <Texto
                id={id}
                valor={formulario.descontoMaximo}
                invalido={invalido}
                inputMode="decimal"
                alinharADireita
                aoMudar={(valor) => mudar('descontoMaximo', valor.replace(/[^0-9.]/g, ''))}
              />
            )}
          </Campo>
        </Grade>
      </Bloco>

      <Bloco titulo="Crédito">
        <p className="text-body-sm text-stone">
          Limite a prazo, dias para bloqueio, situação e autorização de pagamento ficam na aba
          Principal. Os quatro são lidos pela análise de crédito.
        </p>
      </Bloco>
    </div>
  );
}
