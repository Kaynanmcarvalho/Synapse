import { IndiceOperacional, Text } from '@synapse/sdl';
import { formatarMoeda } from '../customers/formato';
import type { Dashboard } from './dashboard.types';

/** Ranking de filiais por faturamento — mesma coluna "Faturamento" que já
 *  aparece no comparativo abaixo, só ordenada e com barra proporcional ao
 *  maior valor do conjunto. Responde a uma pergunta real ("quais filiais
 *  faturam mais, sem ler a tabela linha por linha") sobre um dado que já
 *  existe; não é uma métrica nova, nem um score — é `revenueCentavos`
 *  ordenado. `IndiceOperacional` cabe aqui porque a lista TEM posição de
 *  verdade (1º, 2º, 3º em faturamento), diferente de uma tabela comum. */
export function RankingDeFiliais({ branches }: { readonly branches: Dashboard['branches'] }) {
  const ordenadas = [...branches].sort((a, b) => b.revenueCentavos - a.revenueCentavos);
  const maior = ordenadas[0]?.revenueCentavos || 1;
  return (
    <ul className="flex flex-col gap-2">
      {ordenadas.map((filial, indice) => (
        <li key={filial.branchId} className="flex items-center gap-3">
          <IndiceOperacional posicao={indice + 1} />
          <Text variant="corpo" className="w-40 shrink-0 truncate font-medium">
            {filial.branchId}
          </Text>
          <div className="bg-surface-suave h-2 min-w-0 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.max(2, (filial.revenueCentavos / maior) * 100)}%` }}
            />
          </div>
          <Text variant="dado" className="w-28 shrink-0 text-right font-semibold">
            {formatarMoeda(filial.revenueCentavos)}
          </Text>
        </li>
      ))}
    </ul>
  );
}
