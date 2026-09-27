import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { CampoContexto } from './campo-contexto';
import type { Densidade } from './visual';

/** Rotulo em cima, controle embaixo, aviso no lugar da dica.
 *
 *  O `Field` e quem amarra o campo: gera o id, liga o `<label>` ao controle,
 *  aponta `aria-describedby` para a dica ou para o erro e marca `aria-invalid`.
 *  O controle dentro dele nao precisa saber de nada disso.
 *
 *  O erro e informacao de contexto, nao alarme: uma linha abaixo do campo, na
 *  cor de perigo. Nada de caixa vermelha empurrando o formulario. */

export type LarguraDoCampo = 1 | 2 | 3 | 4 | 'full';

const LARGURA: Readonly<Record<string, string>> = {
  1: '',
  2: 'col-span-2',
  3: 'col-span-2 sm:col-span-3',
  4: 'col-span-2 sm:col-span-4',
  full: 'col-span-full',
};

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  readonly label: string;
  readonly hint?: ReactNode;
  readonly error?: string | null;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly density?: Densidade;
  /** Quantas colunas o campo ocupa quando esta dentro de uma grade. */
  readonly span?: LarguraDoCampo;
  readonly children: ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required = false,
  disabled = false,
  density = 'padrao',
  span = 1,
  className,
  children,
  ...resto
}: FieldProps) {
  const base = useId();
  const id = `${base}-controle`;
  const idDaDica = `${base}-dica`;
  const idDoErro = `${base}-erro`;
  const invalid = Boolean(error);
  const describedBy = invalid ? idDoErro : hint ? idDaDica : undefined;

  return (
    <div className={cn('min-w-0', LARGURA[String(span)], className)} {...resto}>
      <label htmlFor={id} className="text-caption text-ink-medio mb-1.5 block font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-ink-sutil ml-0.5 font-normal">
            *
          </span>
        ) : null}
      </label>
      <CampoContexto.Provider value={{ id, invalid, describedBy, density, required, disabled }}>
        {children}
      </CampoContexto.Provider>
      {invalid ? (
        <p id={idDoErro} className="text-caption text-status-perigo mt-1.5">
          {error}
        </p>
      ) : hint ? (
        <p id={idDaDica} className="text-caption text-ink-sutil mt-1.5">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
