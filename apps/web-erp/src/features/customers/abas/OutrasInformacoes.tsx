import { Field } from '@synapse/sdl';
import { AreaDeTexto, Secao, ValoresDeLeitura } from '../../../components/formulario/Formulario';
import { formatarData } from '../formato';
import type { PropsDaAba } from './aba';

/** Aba Outras Informações: a anotação que não vai para o cliente e o registro
 *  de quem mexeu na ficha. Quem alterou limite de crédito é pergunta que
 *  aparece cedo ou tarde.
 *
 *  Fase 6.2: "Registro da ficha" é puramente consultivo (código, autoria,
 *  versão, identificador) — vira `ValoresDeLeitura` no lugar do `dl` próprio
 *  com `Linha`, a mesma peça que `Identificacao` (aba Principal) já usa para
 *  código e data. `observacaoInterna` também aparece em Pessoa Jurídica
 *  (mesmo campo do formulário, dois lugares para editar) — comportamento já
 *  existia antes desta fase; não é regra nova. */

/** Autoria de quem mexeu. Cadastro antigo guardava so o uid em `updatedBy` e o
 *  nome em `updatedByName`; sem nenhum dos dois, diz que nao foi registrado. */
const autoria = (ator: unknown, nomeAntigo?: unknown): string => {
  if (ator && typeof ator === 'object') {
    const registro = ator as { readonly name?: string; readonly email?: string };
    if (registro.name || registro.email) return (registro.name || registro.email) as string;
  }
  return typeof nomeAntigo === 'string' && nomeAntigo ? nomeAntigo : 'Não registrado';
};

export function AbaOutrasInformacoes({ formulario, mudar, cliente }: PropsDaAba) {
  return (
    <div className="grid gap-4">
      <Secao
        titulo="Anotação interna"
        descricao="Só a equipe vê. Não sai em documento nenhum para o cliente."
      >
        <Field label="Anotação">
          <AreaDeTexto
            value={formulario.observacaoInterna}
            rows={5}
            onChange={(e) => mudar('observacaoInterna', e.target.value)}
          />
        </Field>
      </Secao>

      <Secao
        titulo="Registro da ficha"
        descricao="Quem cadastrou, quem alterou por último e a versão"
      >
        {cliente ? (
          <ValoresDeLeitura
            itens={[
              { rotulo: 'Código', valor: cliente.codigo ?? 'Não gerado', dado: true },
              {
                rotulo: 'Cadastrado em',
                valor: cliente.createdAt
                  ? `${formatarData(cliente.createdAt)} · ${autoria(cliente.createdBy)}`
                  : 'Antes da tela de cadastro (não registrado)',
              },
              {
                rotulo: 'Última alteração',
                valor: `${formatarData(cliente.updatedAt)} · ${autoria(cliente.updatedBy, (cliente as { readonly updatedByName?: unknown }).updatedByName)}`,
              },
              {
                rotulo: 'Versão da ficha',
                valor: cliente.version ? String(cliente.version) : 'Não registrada',
                dado: true,
              },
              { rotulo: 'Identificador', valor: cliente.id, dado: true },
            ]}
          />
        ) : (
          <p className="text-body-sm text-stone">
            O registro aparece depois de salvar: código, quem cadastrou, quem alterou por último e a
            versão da ficha.
          </p>
        )}
      </Secao>
    </div>
  );
}
