import { Text } from '@synapse/sdl';
import type { ReactNode } from 'react';

/** Um item da faixa de indicadores: rótulo em cima, número tabular grande no
 *  meio, legenda de apoio embaixo. Nasceu no redesign de Estoque (Fase 7,
 *  onde vira `dl`+`divide-x`, gramática de `SnapshotDoCliente` no crédito) e
 *  o Dashboard (Fase 7.2) foi o segundo consumidor real — por isso sai daqui
 *  em vez de duplicado. Cor só quando o valor exige atenção (`atencao`);
 *  nunca um card isolado com ícone dentro de círculo. */
export function Indicador({
  rotulo,
  valor,
  apoio,
  atencao = false,
}: {
  readonly rotulo: string;
  readonly valor: ReactNode;
  /** Omitido quando a legenda já é dita uma vez só, acima de todo o grupo
   *  (ex.: o mesmo período para os quatro indicadores de uma faixa) — repetir
   *  o mesmo texto embaixo de cada número seria ruído, não contexto. */
  readonly apoio?: ReactNode;
  readonly atencao?: boolean;
}) {
  return (
    <div className="min-w-0 px-5 first:pl-0">
      <Text variant="rotulo" as="dt">
        {rotulo}
      </Text>
      <Text
        variant="dado"
        as="dd"
        {...(atencao ? { tone: 'perigo' as const } : {})}
        className="text-heading-md mt-1 block font-semibold"
      >
        {valor}
      </Text>
      {apoio ? (
        <Text variant="legenda" as="dd" tone="sutil" className="mt-0.5 block">
          {apoio}
        </Text>
      ) : null}
    </div>
  );
}
