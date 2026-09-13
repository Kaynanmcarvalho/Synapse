import type { ExposicaoDoPedido, ImpactoDaAprovacao } from '@synapse/types';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatarMoeda, formatarPercentual } from '../analise';

/** "Impacto desta aprovacao": o antes, o pedido e o depois, sempre com numero
 *  e percentual — a barra ajuda o olho, mas nao carrega a informacao sozinha. */

const moedaOu = (valor: number | null, vazio: string) =>
  valor === null ? vazio : formatarMoeda(valor);

function Numero({
  rotulo,
  valor,
  alerta = false,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly alerta?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-caption text-stone">{rotulo}</dt>
      <dd
        className={`text-body-sm font-semibold tabular-nums ${alerta ? 'text-[#b3242f]' : 'text-ink'}`}
      >
        {valor}
      </dd>
    </div>
  );
}

function Coluna({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-charcoal mb-1.5 font-semibold">{titulo}</p>
      <dl className="grid gap-1">{children}</dl>
    </div>
  );
}

/** Barra de utilizacao: o que ja estava tomado, o que este pedido acrescenta e
 *  a marca do limite. Passou de 100%, a escala cresce para caber. */
export function BarraDeUtilizacao({ impacto }: { readonly impacto: ImpactoDaAprovacao }) {
  const antes = impacto.utilizacaoAntesPercentual;
  const depois = impacto.utilizacaoDepoisPercentual;
  if (antes === null || depois === null) return null;
  const escala = Math.max(100, depois);
  const largura = (valor: number) => `${Math.min(100, (Math.max(0, valor) / escala) * 100)}%`;
  const estourou = depois > 100;
  return (
    <div className="mt-3">
      <div
        role="img"
        aria-label={`Utilização do limite: ${formatarPercentual(antes)} antes, ${formatarPercentual(depois)} depois da aprovação`}
        className="bg-surface-soft relative h-3 overflow-hidden rounded-full"
      >
        <span className="bg-charcoal absolute inset-y-0 left-0" style={{ width: largura(antes) }} />
        <span
          className={`absolute inset-y-0 ${estourou ? 'bg-[#b3242f]' : 'bg-primary'}`}
          style={{ left: largura(antes), width: largura(depois - antes) }}
        />
        <span
          aria-hidden="true"
          className="bg-ink absolute inset-y-[-2px] w-0.5"
          style={{ left: largura(100) }}
        />
      </div>
      <div className="text-caption text-stone mt-1.5 flex flex-wrap justify-between gap-x-3">
        <span>
          <span className="bg-charcoal mr-1 inline-block h-2 w-2 rounded-sm align-middle" />
          Já comprometido {formatarPercentual(antes)}
        </span>
        <span>
          <span
            className={`mr-1 inline-block h-2 w-2 rounded-sm align-middle ${estourou ? 'bg-[#b3242f]' : 'bg-primary'}`}
          />
          Com este pedido {formatarPercentual(depois)}
        </span>
        <span>| limite = 100%</span>
      </div>
    </div>
  );
}

export function Impacto({
  impacto,
  exposicao,
}: {
  readonly impacto: ImpactoDaAprovacao;
  readonly exposicao: ExposicaoDoPedido;
}) {
  const semLimite = impacto.limiteCentavos === null || impacto.limiteCentavos === 0;
  const vazio = semLimite ? 'Sem limite' : '—';
  const negativo = (valor: number | null) => valor !== null && valor < 0;

  return (
    <div>
      {!impacto.consomeLimite && (
        <p className="border-accent-teal/35 bg-accent-teal/[0.07] text-accent-green-text text-body-sm mb-3 flex items-start gap-2 rounded-xl border px-3 py-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">
              Esta operação não compromete limite de crédito.
            </strong>{' '}
            {exposicao.explicacao}
          </span>
        </p>
      )}
      <div className="divide-hairline-light grid gap-2.5 divide-y [&>*+*]:pt-2.5">
        <Coluna titulo="Antes">
          <Numero rotulo="Limite" valor={moedaOu(impacto.limiteCentavos, 'Sem cadastro')} />
          <Numero rotulo="Comprometido" valor={formatarMoeda(impacto.comprometidoAntesCentavos)} />
          <Numero
            rotulo="Disponível"
            valor={moedaOu(impacto.disponivelAntesCentavos, vazio)}
            alerta={negativo(impacto.disponivelAntesCentavos)}
          />
        </Coluna>
        <Coluna titulo="Este pedido">
          <Numero rotulo="Valor comercial" valor={formatarMoeda(impacto.valorComercialCentavos)} />
          <Numero rotulo="Exposição gerada" valor={formatarMoeda(impacto.exposicaoCentavos)} />
        </Coluna>
        <Coluna titulo="Depois da aprovação">
          <Numero rotulo="Comprometido" valor={formatarMoeda(impacto.comprometidoDepoisCentavos)} />
          <Numero
            rotulo="Disponível"
            valor={moedaOu(impacto.disponivelDepoisCentavos, vazio)}
            alerta={negativo(impacto.disponivelDepoisCentavos)}
          />
          <Numero
            rotulo="Utilização"
            valor={
              impacto.utilizacaoDepoisPercentual === null
                ? vazio
                : formatarPercentual(impacto.utilizacaoDepoisPercentual)
            }
            alerta={(impacto.utilizacaoDepoisPercentual ?? 0) > 100}
          />
        </Coluna>
      </div>
      <BarraDeUtilizacao impacto={impacto} />
      {semLimite && impacto.consomeLimite && (
        <p className="text-caption mt-2 text-[#8a4b00]">
          O cliente não tem limite de crédito concedido: toda exposição fica fora da política.
        </p>
      )}
    </div>
  );
}
