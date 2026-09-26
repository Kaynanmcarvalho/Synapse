/** Tipos do que a aplicacao consome do SDL em tempo de execucao. O tema do
 *  Tailwind é montado em JavaScript (`tailwind.preset.js`) e nao precisa de
 *  tipo; o que passa pelo TypeScript é o pouco que segue abaixo. */

export interface DadosDaMarca {
  /** Custom property onde a cor da marca do tenant é escrita. */
  readonly variavel: string;
  /** Cobalto do Synapse, usado quando o tenant nao define cor. */
  readonly padraoHex: string;
  /** O mesmo cobalto em canais RGB (`'73 79 223'`), formato que o Tailwind usa
   *  para poder aplicar opacidade. */
  readonly padraoCanais: string;
}

export declare const MARCA: DadosDaMarca;

/** `'#494fdf'` -> `'73 79 223'`. Devolve `null` quando o valor nao é um hex de
 *  3 ou 6 dígitos — branding inválido nao pode apagar a marca da tela. */
export declare const canaisDoHex: (hex: string | null | undefined) => string | null;

/** Monta `rgb(var(--sdl-marca, 73 79 223) / <alfa>)`. */
export declare const corDaMarca: (alfa?: string) => string;

export declare const primitivos: Record<string, unknown>;
export declare const semanticos: Record<string, unknown>;
