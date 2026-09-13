import type { ReactNode } from 'react';

/** Moldura das quatro partes da tela: mesmo titulo, mesma borda, mesma altura
 *  de cabecalho — o olho do analista troca de area sem se reposicionar. */
export function Cartao({
  titulo,
  acao,
  rodape,
  children,
}: {
  readonly titulo: string;
  readonly acao?: ReactNode;
  readonly rodape?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="border-hairline-light bg-canvas-light flex min-h-0 min-w-0 flex-col rounded-2xl border">
      <header className="flex min-h-[56px] flex-wrap items-center justify-between gap-2 px-5 py-3">
        <h2 className="font-display text-heading-sm text-ink">{titulo}</h2>
        {acao}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
      {rodape && (
        <footer className="border-hairline-light flex flex-wrap items-center gap-x-6 gap-y-1 border-t px-5 py-3">
          {rodape}
        </footer>
      )}
    </section>
  );
}

export function Total({
  rotulo,
  valor,
  tom = 'neutro',
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly tom?: 'neutro' | 'alerta' | 'positivo';
}) {
  const cor =
    tom === 'alerta' ? 'text-accent-danger' : tom === 'positivo' ? 'text-accent-teal' : 'text-ink';
  return (
    <span className="flex flex-col">
      <span className="text-caption text-stone">{rotulo}</span>
      <strong className={`text-body-md font-semibold ${cor}`}>{valor}</strong>
    </span>
  );
}

export function Vazio({ texto }: { readonly texto: string }) {
  return <p className="text-body-sm text-stone py-8 text-center">{texto}</p>;
}
