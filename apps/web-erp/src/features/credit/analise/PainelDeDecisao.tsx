import type {
  AvaliacaoDoPedido,
  ComportamentoFinanceiro,
  ParametrosDaAnalise,
  SinalDeDecisao,
} from '@synapse/types';
import { TOM } from '../ui/tons';
import { Secao } from '../ui/Superficies';
import { Comportamento } from './Comportamento';
import { Impacto } from './Impacto';

/** Evidencias organizadas, uma por linha, com a fonte do dado. Nao ha nota nem
 *  "risco baixo": o analista le e decide. */
export function Sinais({ sinais }: { readonly sinais: readonly SinalDeDecisao[] }) {
  if (sinais.length === 0)
    return <p className="text-body-sm text-stone">Nenhum sinal calculado para este pedido.</p>;
  return (
    <ul className="grid gap-2">
      {sinais.map((sinal) => {
        const { Icone, classe, rotulo } = TOM[sinal.tom];
        return (
          <li key={sinal.id} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${classe}`}
              title={rotulo}
            >
              <Icone size={13} aria-hidden="true" />
              <span className="sr-only">{rotulo}:</span>
            </span>
            <span className="min-w-0">
              <span className="text-body-sm text-ink block">{sinal.texto}</span>
              <span className="text-caption text-stone block">Fonte: {sinal.fonte}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Coluna de decisao da analise: impacto, sinais e comportamento. Fica fixa ao
 *  lado do conteudo enquanto o analista rola itens e historico. */
export function PainelDeDecisao({
  avaliacao,
  comportamento,
  parametros,
}: {
  readonly avaliacao: AvaliacaoDoPedido | null;
  readonly comportamento: ComportamentoFinanceiro;
  readonly parametros: ParametrosDaAnalise;
}) {
  return (
    <div className="grid gap-3">
      {avaliacao ? (
        <>
          <Secao titulo="Impacto desta aprovação">
            <Impacto impacto={avaliacao.impacto} exposicao={avaliacao.exposicao} />
          </Secao>
          <Secao titulo="Sinais para decisão">
            <Sinais sinais={avaliacao.sinais} />
          </Secao>
        </>
      ) : (
        <Secao titulo="Impacto desta aprovação">
          <p className="text-body-sm text-stone">
            A avaliação deste pedido não veio com a ficha. Atualize a ficha do cliente.
          </p>
        </Secao>
      )}
      <Secao titulo="Comportamento financeiro">
        <Comportamento comportamento={comportamento} parametros={parametros} />
      </Secao>
    </div>
  );
}
