import type { EtapaDoPedido, MotivoDaAnalise, TomDoSinal } from '@synapse/types';
import { ROTULO_DA_ETAPA } from '../pedido/rotulos';
import { TOM, tomDoMotivo } from './tons';

/** Etiquetas da analise. Cor nunca e a unica pista: cada tom tem icone e
 *  texto, e o tom de texto e escuro o bastante para ler em fundo claro. */

export function EtiquetaDeMotivo({ motivo }: { readonly motivo: MotivoDaAnalise }) {
  const { classe, Icone } = TOM[tomDoMotivo(motivo)];
  return (
    <span
      title={motivo.detalhe}
      className={`text-caption inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-px font-semibold ${classe}`}
    >
      <Icone size={12} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{motivo.rotulo}</span>
      {motivo.violaPolitica && <span className="sr-only"> — fora da política</span>}
    </span>
  );
}

/** Motivos em linha, com os que ferem a politica primeiro. `maximo` mostra so os
 *  primeiros e resume o resto em "+2". */
export function Motivos({
  motivos,
  maximo,
}: {
  readonly motivos: readonly MotivoDaAnalise[];
  readonly maximo?: number;
}) {
  const ordenados = [...motivos].sort((a, b) => Number(b.violaPolitica) - Number(a.violaPolitica));
  const visiveis = maximo ? ordenados.slice(0, maximo) : ordenados;
  const resto = ordenados.length - visiveis.length;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {visiveis.map((motivo) => (
        <EtiquetaDeMotivo key={motivo.codigo} motivo={motivo} />
      ))}
      {resto > 0 && (
        <span
          className="text-caption text-stone font-semibold"
          title={ordenados
            .slice(visiveis.length)
            .map((motivo) => motivo.rotulo)
            .join(' · ')}
        >
          +{resto}
        </span>
      )}
    </span>
  );
}

const TOM_DA_ETAPA: Record<EtapaDoPedido, string> = {
  VENDEDOR: 'border-accent-link/40 text-accent-link',
  GERENCIA_COMERCIAL: 'border-accent-warning/40 text-[#8a4b00]',
  CREDITO: 'border-canvas-dark/30 text-ink',
  FATURAMENTO: 'border-accent-teal/40 text-accent-green-text',
  EXPEDICAO: 'border-hairline-strong/30 text-charcoal',
};

export function EtiquetaDaEtapa({ etapa }: { readonly etapa: EtapaDoPedido }) {
  return (
    <span
      className={`text-caption inline-flex rounded-full border px-2 py-px font-semibold ${TOM_DA_ETAPA[etapa]}`}
    >
      {ROTULO_DA_ETAPA[etapa]}
    </span>
  );
}

/** Situacao de um documento (pedido, titulo, boleto) em pilula neutra, com
 *  destaque so para o que pede atencao. */
export function Situacao({
  texto,
  tom = 'neutro',
}: {
  readonly texto: string;
  readonly tom?: TomDoSinal;
}) {
  const { classe, Icone } = TOM[tom];
  return (
    <span
      className={`text-caption inline-flex items-center gap-1 rounded-full border px-2 py-px font-semibold ${classe}`}
    >
      <Icone size={12} aria-hidden="true" />
      {texto}
    </span>
  );
}
