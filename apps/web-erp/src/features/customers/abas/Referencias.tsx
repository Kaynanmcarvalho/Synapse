import type { Customer } from '@synapse/types';
import { Handshake, Plus, Trash2 } from 'lucide-react';
import { Area, Bloco, Campo, Grade, Texto } from '../campos';
import { formatarData, mascararTelefone } from '../formato';
import type { ReferenciaNoFormulario } from '../formulario';
import type { PropsDaAba } from './aba';

/** Aba Referências Comerciais: quem já vende para este cliente e o que
 *  respondeu. É informação de terceiro — por isso cada referência guarda quem
 *  anotou e quando, e isso não se edita depois. */

type CampoDaReferencia = 'empresa' | 'contato' | 'telefone' | 'observacao';

const NOVA: ReferenciaNoFormulario = { empresa: '', contato: '', telefone: '', observacao: '' };

const quemAnotou = (cliente: Customer | null, id?: string): string => {
  const guardada = cliente?.referenciasComerciais?.find((item) => item.id === id);
  return guardada
    ? `Anotada por ${guardada.registradaPorNome} em ${formatarData(guardada.registradaEm)}`
    : 'Ainda não salva';
};

function CartaoDaReferencia({
  referencia,
  cliente,
  aoMudar,
  aoRemover,
}: {
  readonly referencia: ReferenciaNoFormulario;
  readonly cliente: Customer | null;
  readonly aoMudar: (campo: CampoDaReferencia, valor: string) => void;
  readonly aoRemover: () => void;
}) {
  return (
    <li className="border-hairline-light bg-surface-soft/50 rounded-2xl border p-4">
      <Grade colunas={4}>
        <Campo rotulo="Empresa" largura={2}>
          {({ id }) => (
            <Texto
              id={id}
              valor={referencia.empresa}
              maxLength={160}
              aoMudar={(valor) => aoMudar('empresa', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Contato">
          {({ id }) => (
            <Texto
              id={id}
              valor={referencia.contato}
              maxLength={160}
              aoMudar={(valor) => aoMudar('contato', valor)}
            />
          )}
        </Campo>
        <Campo rotulo="Telefone">
          {({ id }) => (
            <Texto
              id={id}
              valor={referencia.telefone}
              inputMode="tel"
              aoMudar={(valor) => aoMudar('telefone', mascararTelefone(valor))}
            />
          )}
        </Campo>
        <Campo rotulo="O que responderam" largura="tudo">
          {({ id }) => (
            <Area
              id={id}
              valor={referencia.observacao}
              linhas={2}
              maxLength={400}
              aoMudar={(valor) => aoMudar('observacao', valor)}
            />
          )}
        </Campo>
      </Grade>
      <div className="border-hairline-light mt-4 flex items-center justify-between gap-3 border-t pt-3">
        <span className="text-caption text-stone">{quemAnotou(cliente, referencia.id)}</span>
        <button
          type="button"
          onClick={aoRemover}
          className="text-button-sm inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[#b3242f] transition hover:bg-[#fdeced]"
        >
          <Trash2 size={14} aria-hidden="true" /> Remover
        </button>
      </div>
    </li>
  );
}

export function AbaReferencias({ formulario, mudar, erros, cliente }: PropsDaAba) {
  const referencias = formulario.referencias;
  const alterar = (indice: number, campo: CampoDaReferencia, valor: string) =>
    mudar(
      'referencias',
      referencias.map((referencia, posicao) =>
        posicao === indice ? { ...referencia, [campo]: valor } : referencia,
      ),
    );
  return (
    <Bloco
      titulo={`Referências comerciais (${referencias.length})`}
      icone={Handshake}
      descricao="Quem já vende para este cliente e o que respondeu"
      acao={
        <button
          type="button"
          onClick={() => mudar('referencias', [...referencias, NOVA])}
          disabled={referencias.length >= 20}
          className="bg-surface-soft text-button-sm text-ink inline-flex h-8 items-center gap-1.5 rounded-full px-3 transition hover:bg-[#ececee] disabled:opacity-40"
        >
          <Plus size={14} aria-hidden="true" /> Referência
        </button>
      }
    >
      {referencias.length === 0 ? (
        <p className="text-body-sm text-stone">
          Nenhuma referência anotada. Elas ajudam a decidir o primeiro limite de um cliente sem
          histórico no Synapse.
        </p>
      ) : (
        <ul className="grid gap-3">
          {referencias.map((referencia, indice) => (
            <CartaoDaReferencia
              key={referencia.id ?? indice}
              referencia={referencia}
              cliente={cliente}
              aoMudar={(campo, valor) => alterar(indice, campo, valor)}
              aoRemover={() =>
                mudar(
                  'referencias',
                  referencias.filter((_, posicao) => posicao !== indice),
                )
              }
            />
          ))}
        </ul>
      )}
      {erros.referencias ? (
        <p className="text-caption mt-2 text-[#b3242f]">{erros.referencias}</p>
      ) : null}
    </Bloco>
  );
}
