import type { ReactNode, ThHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import type { Alinhamento, Ordenacao } from './tipos';

const ALINHAMENTO: Record<Alinhamento, string> = {
  esquerda: 'text-left',
  direita: 'text-right',
  centro: 'text-center',
};

export interface DataGridCabecalhoProps<TId extends string> extends Omit<
  ThHTMLAttributes<HTMLTableCellElement>,
  'id'
> {
  readonly id: TId;
  readonly rotulo: string;
  readonly alinhamento?: Alinhamento;
  /** Omitidos: coluna não ordenável, cabeçalho é só texto — o caso de
   *  Clientes hoje. */
  readonly ordenacao?: Ordenacao<TId> | null;
  readonly aoOrdenar?: (coluna: TId) => void;
  /** O SDL não importa biblioteca de ícone — quem usa injeta o próprio
   *  glifo (`lucide-react` no web-erp). Sem os dois, um "↑"/"↓" simples
   *  ainda deixa a ordenação legível. */
  readonly iconeAscendente?: ReactNode;
  readonly iconeDescendente?: ReactNode;
}

/** Cabeçalho de coluna congelado na Fase 4.4: sentence case, `text-caption`,
 *  sem uppercase/tracking artificial, indicador de ordenação discreto.
 *  Cobre o caso comum; quem precisa de resize/reorder (a fila de crédito,
 *  hoje) continua compondo o próprio `<th>` — ver `README.md#data-row` para
 *  o porquê de não forçar essa capacidade em toda tabela. */
export function DataGridCabecalho<TId extends string>({
  id,
  rotulo,
  alinhamento = 'esquerda',
  ordenacao,
  aoOrdenar,
  iconeAscendente = '↑',
  iconeDescendente = '↓',
  className,
  ...resto
}: DataGridCabecalhoProps<TId>) {
  const ordenavel = Boolean(aoOrdenar);
  const ordenada = ordenacao?.coluna === id;
  const icone = ordenacao?.direcao === 'asc' ? iconeAscendente : iconeDescendente;

  return (
    <th
      scope="col"
      aria-sort={
        !ordenavel
          ? undefined
          : ordenada
            ? ordenacao?.direcao === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
      }
      className={cn(
        'text-caption text-ink-medio whitespace-nowrap px-3 py-2.5 font-medium',
        ALINHAMENTO[alinhamento],
        className,
      )}
      {...resto}
    >
      {ordenavel ? (
        <button
          type="button"
          onClick={() => aoOrdenar?.(id)}
          className={cn(
            'inline-flex max-w-full items-center gap-1',
            alinhamento === 'direita' && 'flex-row-reverse',
          )}
        >
          <span className={cn('truncate', ordenada && 'text-ink')}>{rotulo}</span>
          {ordenada && (
            <span aria-hidden="true" className="text-ink shrink-0 text-[10px] leading-none">
              {icone}
            </span>
          )}
        </button>
      ) : (
        <span className="truncate">{rotulo}</span>
      )}
    </th>
  );
}
