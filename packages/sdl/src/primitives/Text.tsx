import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/** A porta da escala tipografica do Synapse.
 *
 *  O nome diz a funcao no texto, nunca o tamanho: quem escreve `tituloSecao`
 *  continua certo se a escala mudar. Sao poucos papeis de proposito — variante
 *  demais vira a mesma bagunca que a escala solta do Tailwind. */

export type PapelDeTexto =
  | 'tituloTela'
  | 'tituloSecao'
  | 'tituloCartao'
  | 'corpoGrande'
  | 'corpo'
  | 'corpoSecundario'
  | 'rotulo'
  | 'legenda'
  | 'dado'
  | 'codigo';

export type TomDeTexto =
  'padrao' | 'apoio' | 'sutil' | 'marca' | 'ok' | 'atencao' | 'perigo' | 'inverso';

/** A escala do trabalho, e nao a de uma pagina de marketing: o titulo de tela
 *  tem 24px porque e o que todas as telas do ERP ja usam, e o corpo tem 14px
 *  porque e nele que a operacao passa o dia. 16px (`corpoGrande`) fica para
 *  introducao; 32px, para a excecao que precisar. */
const PAPEL: Readonly<Record<PapelDeTexto, string>> = {
  tituloTela: 'font-display text-heading-md text-ink',
  tituloSecao: 'font-display text-heading-sm text-ink',
  tituloCartao: 'text-body-md font-semibold text-ink',
  corpoGrande: 'text-body-md text-ink-padrao',
  corpo: 'text-body-sm text-ink-padrao',
  corpoSecundario: 'text-body-sm text-ink-apoio',
  rotulo: 'text-caption font-medium text-ink-medio',
  legenda: 'text-caption text-ink-sutil',
  /** Numero, documento, SKU e chave: `font-data` liga os algarismos de largura
   *  fixa, e coluna de valor para de dancar a cada digito. */
  dado: 'font-data text-body-sm text-ink',
  codigo: 'font-code text-body-sm text-ink-padrao',
};

const TOM: Readonly<Record<TomDeTexto, string>> = {
  padrao: 'text-ink-padrao',
  apoio: 'text-ink-apoio',
  sutil: 'text-ink-sutil',
  marca: 'text-primary',
  ok: 'text-status-ok',
  atencao: 'text-status-atencao',
  perigo: 'text-status-perigo',
  inverso: 'text-ink-inverso',
};

const ELEMENTO: Readonly<Record<PapelDeTexto, ElementType>> = {
  tituloTela: 'h1',
  tituloSecao: 'h2',
  tituloCartao: 'h3',
  corpoGrande: 'p',
  corpo: 'p',
  corpoSecundario: 'p',
  rotulo: 'span',
  legenda: 'span',
  dado: 'span',
  codigo: 'code',
};

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  readonly variant?: PapelDeTexto;
  readonly tone?: TomDeTexto;
  /** Troca o elemento sem mudar o papel: um titulo de secao que, naquele lugar,
   *  precisa ser `<h3>` por causa da hierarquia da pagina.
   *
   *  Use `as="span"` em contexto de linha — dentro de `<button>`, de `<td>` ou
   *  de outro paragrafo. `corpo` renderiza `<p>`, e paragrafo dentro de
   *  paragrafo ou de botao e HTML invalido. */
  readonly as?: ElementType;
  readonly children?: ReactNode;
}

export function Text({ variant = 'corpo', tone, as, className, children, ...resto }: TextProps) {
  const Elemento = as ?? ELEMENTO[variant];
  return (
    <Elemento className={cn(PAPEL[variant], tone && TOM[tone], className)} {...resto}>
      {children}
    </Elemento>
  );
}
