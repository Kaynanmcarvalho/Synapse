import { Link } from 'react-router-dom';

/** Glifo em cobalto + nome: o unico ponto em que a cor da marca aparece sempre. */
export function Marca({
  nome = 'Synapse',
  logoUrl = null,
  para,
}: {
  readonly nome?: string;
  readonly logoUrl?: string | null;
  readonly para?: string;
}) {
  const conteudo = (
    <>
      <span className="bg-primary text-primary-on flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-semibold">
        {logoUrl ? (
          <img alt="" className="h-full w-full object-cover" src={logoUrl} />
        ) : (
          nome.charAt(0).toUpperCase()
        )}
      </span>
      <span className="font-display text-heading-sm text-ink tracking-[-0.2px]">{nome}</span>
    </>
  );
  const classe = 'flex shrink-0 items-center gap-2.5';

  return para ? (
    <Link to={para} className={classe} aria-label={`${nome} — início`}>
      {conteudo}
    </Link>
  ) : (
    <span className={classe}>{conteudo}</span>
  );
}
