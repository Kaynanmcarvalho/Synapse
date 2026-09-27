import { cn } from '../lib/cn';

export type GatilhoDoSignal = 'controlado' | 'foco-do-grupo';

export interface SynapseSignalProps {
  /** 'controlado': visibilidade decidida por `ativo` (ex.: linha
   *  selecionada). 'foco-do-grupo': aparece via CSS puro quando a linha
   *  (marcada `group` — `classesDaLinha` já inclui) recebe foco de teclado,
   *  sem estado React — para tabelas sem conceito de seleção. */
  readonly gatilho?: GatilhoDoSignal;
  readonly ativo?: boolean;
  readonly className?: string;
}

/** O traço de cobalto de 2px que marca "esta é a linha corrente" — a mesma
 *  gramática do indicador de módulo ativo (MenuBar) e da linha selecionada
 *  da Command Window. Deve ficar dentro da primeira célula visível. */
export function SynapseSignal({
  gatilho = 'controlado',
  ativo = false,
  className,
}: SynapseSignalProps) {
  if (gatilho === 'controlado' && !ativo) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-primary absolute inset-y-1.5 left-0 w-[2px] rounded-full',
        gatilho === 'foco-do-grupo' &&
          'duration-instantaneo scale-y-0 opacity-0 transition-all group-focus-visible:scale-y-100 group-focus-visible:opacity-100',
        className,
      )}
    />
  );
}
