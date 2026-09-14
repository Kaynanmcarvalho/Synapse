import type { Product } from '@synapse/types';
import { formatarMoeda } from '../../customers/formato';

/** A linha de baixo do lançamento: o erro, o produto escolhido com o preço de
 *  tabela, ou a dica do que fazer. */
export function DicaDoLancamento({
  aviso,
  produto,
  precoDeTabela,
  editando,
  lancarAoLerCodigo,
}: {
  readonly aviso: string | null;
  readonly produto: Product | null;
  readonly precoDeTabela: number | null;
  readonly editando: boolean;
  readonly lancarAoLerCodigo: boolean;
}) {
  const dica = editando
    ? 'Ajuste a quantidade ou o valor e grave o item.'
    : lancarAoLerCodigo
      ? 'Leia o código de barras. F2 muda a quantidade antes de ler.'
      : 'Digite o código e Enter; sem código, Enter abre a lista de produtos (F12).';
  return (
    <p className="text-caption mt-2 min-h-[1.1rem]" role="status">
      {aviso ? <span className="text-[#b3242f]">{aviso}</span> : null}
      {!aviso && produto ? (
        <span className="text-stone">
          {[
            produto.logistics.unit,
            produto.logistics.weightKg ? `${produto.logistics.weightKg} kg` : null,
            precoDeTabela !== null ? `preço de tabela ${formatarMoeda(precoDeTabela)}` : null,
            produto.brand,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      ) : null}
      {!aviso && !produto ? <span className="text-stone">{dica}</span> : null}
    </p>
  );
}
