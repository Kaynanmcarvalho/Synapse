import { cn } from '../lib/cn';

export interface OpcoesDaLinha {
  readonly selecionada?: boolean;
  readonly clicavel?: boolean;
  /** A fila desenha a hairline na própria `<tr>`. Clientes desenha em cada
   *  `<td>` (menos o leading) — o inset "começa depois da coluna líder". Uma
   *  linha com hairline por célula não pode desenhar a própria borda, ou ela
   *  dobra. */
  readonly hairlineNaLinha?: boolean;
  /** A fila dá ao foco-sem-seleção um anel próprio, distinto do hover.
   *  Clientes não tem estado "selecionada": foco reaproveita a troca de
   *  plano do hover, e quem sinaliza "linha atual" é o Synapse Signal
   *  (`gatilho="foco-do-grupo"`), não um segundo elemento. Duas soluções
   *  corretas para dois problemas diferentes — não force uma na outra. */
  readonly focoComAnel?: boolean;
}

/** Estados da Data Row (congelados na Fase 4.4, `README.md#data-row`):
 *  normal, hover (troca de plano), foco por teclado sem seleção (anel),
 *  selecionada (plano + Synapse Signal, nunca azul sólido), selecionada+
 *  focada (soma o anel por cima do Signal). Traduzido aqui numa função só,
 *  para as telas pararem de reimplementar a mesma regra com classes soltas. */
export const classesDaLinha = ({
  selecionada = false,
  clicavel = true,
  hairlineNaLinha = true,
  focoComAnel = true,
}: OpcoesDaLinha = {}): string =>
  cn(
    'group text-body-sm relative outline-none transition-colors duration-150',
    hairlineNaLinha && 'border-hairline-light border-b last:border-b-0',
    clicavel && 'cursor-pointer',
    focoComAnel && 'focus-visible:ring-primary/40 focus-visible:ring-1 focus-visible:ring-inset',
    selecionada
      ? 'bg-surface-hover'
      : focoComAnel
        ? 'hover:bg-surface-hover'
        : 'hover:bg-surface-hover focus-visible:bg-surface-hover',
  );
