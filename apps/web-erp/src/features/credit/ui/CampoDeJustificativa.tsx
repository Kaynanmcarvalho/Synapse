import { JUSTIFICATIVA_MINIMA } from '@synapse/validation';

/** Justificativa de uma decisao fora da politica ou de uma reprovacao. O minimo
 *  e a mesma regra que a API aplica — o botao so libera quando ela passaria. */
export function CampoDeJustificativa({
  rotulo,
  valor,
  aoMudar,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
}) {
  const valida = valor.trim().length >= JUSTIFICATIVA_MINIMA;
  return (
    <label className="text-caption text-charcoal mt-4 block font-semibold">
      {rotulo}
      <textarea
        data-autofoco
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        rows={3}
        maxLength={1000}
        aria-invalid={!valida}
        className="border-hairline-light text-body-sm text-ink focus:border-hairline-strong mt-1.5 w-full resize-y rounded-xl border px-3 py-2 font-normal outline-none"
      />
      <span className="text-stone font-normal">
        {valida
          ? 'A justificativa fica gravada no histórico do pedido.'
          : `Mínimo de ${JUSTIFICATIVA_MINIMA} caracteres.`}
      </span>
    </label>
  );
}
