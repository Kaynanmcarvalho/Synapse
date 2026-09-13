import type { ReactNode } from 'react';

/** Um grupo de informacoes da janela do pedido: titulo pequeno em caixa alta,
 *  cartao com profundidade e os campos em grade. */
export function Bloco({
  titulo,
  acao,
  children,
}: {
  readonly titulo: string;
  readonly acao?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="border-hairline-light bg-canvas-light shadow-cartao rounded-2xl border p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-caption text-stone font-semibold uppercase tracking-[0.08em]">
          {titulo}
        </h3>
        {acao}
      </header>
      {children}
    </section>
  );
}

export function Campo({
  rotulo,
  children,
  largo = false,
}: {
  readonly rotulo: string;
  readonly children: ReactNode;
  readonly largo?: boolean;
}) {
  return (
    <div className={largo ? 'col-span-2' : ''}>
      <dt className="text-caption text-stone">{rotulo}</dt>
      <dd className="text-body-md text-ink mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

export function Grade({ children }: { readonly children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">{children}</dl>;
}
