import type { PropsDaAba } from './aba';
import { Contato, Endereco, Identificacao } from './principal/Cadastro';
import { Comercial, Credito, Fiscal, Observacao } from './principal/Negocio';

/** Aba Principal: quem é o cliente, onde está, com quem fala e quanto compra a
 *  prazo. É a aba que o balcão preenche inteira no primeiro atendimento. */
export function AbaPrincipal(props: PropsDaAba) {
  return (
    <div className="grid gap-4">
      <Identificacao {...props} />
      <Endereco {...props} />
      <Contato {...props} />
      <Fiscal {...props} />
      <Comercial {...props} />
      <Credito {...props} />
      <Observacao {...props} />
    </div>
  );
}
