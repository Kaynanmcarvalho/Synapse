import type { TdHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import type { Densidade } from '../primitives';
import type { Alinhamento, PapelDeColuna } from './tipos';

const ALINHAMENTO: Record<Alinhamento, string> = {
  esquerda: 'text-left',
  direita: 'text-right',
  centro: 'text-center',
};

/** Só linhas de tabela usam `padrao`/`compacta` de verdade; `confortavel` não
 *  tem precedente em Data Row, mas fica definido por simetria com os outros
 *  controles do SDL. */
const RECUO_VERTICAL: Record<Densidade, string> = {
  compacta: 'py-2',
  padrao: 'py-3',
  confortavel: 'py-3.5',
};

/** Só o papel `data` liga `font-data` automaticamente (CNPJ/CPF, dinheiro,
 *  código, data numérica, quantidade). Texto narrativo (`primary`/`secondary`)
 *  nunca recebe algarismo de largura fixa. */
const PAPEIS_COM_FONTE_DE_DADO: ReadonlySet<PapelDeColuna> = new Set(['data']);

export interface DataGridCelulaProps extends TdHTMLAttributes<HTMLTableCellElement> {
  readonly papel?: PapelDeColuna;
  readonly alinhamento?: Alinhamento;
  readonly densidade?: Densidade;
  /** Hairline própria da célula — o padrão "inset" (a primeira coluna visível
   *  não desenha a linha, o resto sim). Ver `README.md#data-row`. Não é
   *  aplicável a tabelas de colunas livremente reordenáveis (não existe
   *  coluna-âncora estável) — nesse caso a hairline mora na `<tr>`. */
  readonly comHairline?: boolean;
  /** `true` por padrão — o caso comum é uma grade de largura controlada
   *  (colunas com largura fixa/redimensionável), onde o conteúdo corta em
   *  reticências em vez de quebrar linha. Uma tabela de largura livre (sem
   *  `table-fixed`, colunas crescem com o conteúdo) precisa de `false`, ou o
   *  texto perde a quebra natural que já tinha. */
  readonly truncar?: boolean;
}

export function DataGridCelula({
  papel = 'primary',
  alinhamento = 'esquerda',
  densidade = 'padrao',
  comHairline = false,
  truncar = true,
  className,
  children,
  ...resto
}: DataGridCelulaProps) {
  return (
    <td
      className={cn(
        'relative px-3',
        truncar && 'truncate whitespace-nowrap',
        RECUO_VERTICAL[densidade],
        ALINHAMENTO[alinhamento],
        comHairline && 'border-hairline-light border-b',
        PAPEIS_COM_FONTE_DE_DADO.has(papel) && 'font-data',
        className,
      )}
      {...resto}
    >
      {children}
    </td>
  );
}
