import type { MotivoDaAnalise, TomDoSinal } from '@synapse/types';
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

/** Tons da analise: cada um com cor, icone e nome — cor nunca e a unica pista. */

export interface Tom {
  readonly classe: string;
  readonly Icone: LucideIcon;
  readonly rotulo: string;
}

export const TOM: Record<TomDoSinal, Tom> = {
  positivo: {
    classe: 'border-accent-teal/35 bg-accent-teal/[0.07] text-accent-green-text',
    Icone: CircleCheck,
    rotulo: 'Favorável',
  },
  neutro: {
    classe: 'border-hairline-light bg-surface-soft text-charcoal',
    Icone: Info,
    rotulo: 'Informação',
  },
  atencao: {
    classe: 'border-accent-warning/40 bg-accent-warning/[0.08] text-[#8a4b00]',
    Icone: TriangleAlert,
    rotulo: 'Atenção',
  },
  critico: {
    classe: 'border-accent-danger/35 bg-accent-danger/[0.07] text-[#b3242f]',
    Icone: CircleAlert,
    rotulo: 'Crítico',
  },
};

export const tomDoMotivo = (motivo: MotivoDaAnalise): TomDoSinal => {
  if (motivo.violaPolitica) return 'critico';
  return motivo.codigo === 'ANALISE_OBRIGATORIA' ? 'neutro' : 'atencao';
};
