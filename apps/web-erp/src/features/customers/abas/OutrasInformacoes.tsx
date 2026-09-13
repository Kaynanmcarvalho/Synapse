import { Area, Bloco, Campo } from '../campos';
import { formatarData } from '../formato';
import type { PropsDaAba } from './aba';

/** Aba Outras Informações: a anotação que não vai para o cliente e o registro
 *  de quem mexeu na ficha. Quem alterou limite de crédito é pergunta que
 *  aparece cedo ou tarde. */

function Linha({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-caption text-stone">{rotulo}</dt>
      <dd className="text-body-sm text-ink text-right">{valor}</dd>
    </div>
  );
}

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
    <div className="grid gap-3">
      <Bloco titulo="Anotação interna">
        <Campo
          rotulo="Só para a equipe"
          largura="tudo"
          dica="Não sai em documento nenhum para o cliente."
        >
          {({ id }) => (
            <Area
              id={id}
              valor={formulario.observacaoInterna}
              linhas={5}
              aoMudar={(valor) => mudar('observacaoInterna', valor)}
            />
          )}
        </Campo>
      </Bloco>

      <Bloco titulo="Registro da ficha">
        {cliente ? (
          <dl className="divide-hairline-light divide-y">
            <Linha rotulo="Código" valor={cliente.codigo ?? 'Não gerado'} />
            <Linha
              rotulo="Cadastrado em"
              valor={
                cliente.createdAt
                  ? `${formatarData(cliente.createdAt)} · ${autoria(cliente.createdBy)}`
                  : 'Antes da tela de cadastro (não registrado)'
              }
            />
            <Linha
              rotulo="Última alteração"
              valor={`${formatarData(cliente.updatedAt)} · ${autoria(cliente.updatedBy, (cliente as { readonly updatedByName?: unknown }).updatedByName)}`}
            />
            <Linha
              rotulo="Versão da ficha"
              valor={cliente.version ? String(cliente.version) : 'Não registrada'}
            />
            <Linha rotulo="Identificador" valor={cliente.id} />
          </dl>
        ) : (
          <p className="text-body-sm text-stone">
            O registro aparece depois de salvar: código, quem cadastrou, quem alterou por último e a
            versão da ficha.
          </p>
        )}
      </Bloco>
    </div>
  );
}
