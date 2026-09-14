/* eslint-disable max-lines-per-function */
import { ShoppingBasket } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatarMoeda } from '../../customers/formato';
import { brutoDaLinha, escreverQuantidade, liquidoDaLinha, type LinhaDaVenda } from './itens';

/** A grade dos itens lançados: Item, Código, Descrição, Unidade, Qtde, Vl.
 *  Unitário, Vl. Bruto, Vl. Desc. e Vl. Líquido. Setas escolhem a linha, Enter
 *  ou duplo clique alteram, Delete exclui. */

const COLUNAS = [
  { rotulo: 'Item', classe: 'w-14 text-right' },
  { rotulo: 'Código', classe: 'w-32' },
  { rotulo: 'Descrição', classe: '' },
  { rotulo: 'Unidade', classe: 'w-20' },
  { rotulo: 'Qtde', classe: 'w-24 text-right' },
  { rotulo: 'Vl. Unitário', classe: 'w-28 text-right' },
  { rotulo: 'Vl. Bruto', classe: 'w-28 text-right' },
  { rotulo: 'Vl. Desc.', classe: 'w-24 text-right' },
  { rotulo: 'Vl. Líquido', classe: 'w-28 text-right' },
] as const;

export function GradeDeItens({
  linhas,
  selecionada,
  aoSelecionar,
  aoAlterar,
  aoExcluir,
  rotuloDoCodigo = 'Código',
  vazio,
}: {
  readonly linhas: readonly LinhaDaVenda[];
  readonly selecionada: string | null;
  readonly aoSelecionar: (chave: string) => void;
  readonly aoAlterar: (chave: string) => void;
  readonly aoExcluir: (chave: string) => void;
  readonly rotuloDoCodigo?: string;
  readonly vazio: string;
}) {
  const corpo = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!selecionada) return;
    corpo.current
      ?.querySelector(`[data-chave="${selecionada}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selecionada]);

  const mover = (direcao: 1 | -1) => {
    const indice = linhas.findIndex((linha) => linha.chave === selecionada);
    const proxima = linhas[Math.min(linhas.length - 1, Math.max(0, indice + direcao))];
    if (proxima) aoSelecionar(proxima.chave);
  };

  return (
    <div className="border-hairline-light min-h-0 flex-1 overflow-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[920px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="text-caption text-stone text-left">
            {COLUNAS.map((coluna) => (
              <th
                key={coluna.rotulo}
                scope="col"
                className={`border-hairline-light border-b px-3 py-2 font-medium ${coluna.classe}`}
              >
                {coluna.rotulo === 'Código' ? rotuloDoCodigo : coluna.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={corpo}>
          {linhas.map((linha, indice) => {
            const ativa = linha.chave === selecionada;
            return (
              <tr
                key={linha.chave}
                data-chave={linha.chave}
                tabIndex={ativa ? 0 : -1}
                aria-selected={ativa}
                onClick={() => aoSelecionar(linha.chave)}
                onDoubleClick={() => aoAlterar(linha.chave)}
                onKeyDown={(evento) => {
                  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
                    evento.preventDefault();
                    mover(evento.key === 'ArrowDown' ? 1 : -1);
                  }
                  if (evento.key === 'Enter') aoAlterar(linha.chave);
                  if (evento.key === 'Delete') aoExcluir(linha.chave);
                }}
                className={`text-body-sm cursor-pointer outline-none transition ${
                  ativa ? 'bg-[#eef0ff]' : 'hover:bg-surface-soft'
                }`}
              >
                <td className="border-hairline-light text-stone border-b px-3 py-2 text-right tabular-nums">
                  {indice + 1}
                </td>
                <td className="border-hairline-light text-charcoal border-b px-3 py-2 tabular-nums">
                  {linha.codigo}
                </td>
                <td className="border-hairline-light text-ink border-b px-3 py-2">
                  <span className="block font-medium">{linha.descricao}</span>
                  {linha.lote || linha.serie ? (
                    <span className="text-caption text-stone block">
                      {[
                        linha.lote ? `Lote ${linha.lote}` : null,
                        linha.serie ? `Série ${linha.serie}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  ) : null}
                </td>
                <td className="border-hairline-light text-charcoal border-b px-3 py-2">
                  {linha.unidade}
                </td>
                <td className="border-hairline-light text-ink border-b px-3 py-2 text-right tabular-nums">
                  {escreverQuantidade(linha.quantidade)}
                </td>
                <td className="border-hairline-light text-charcoal border-b px-3 py-2 text-right tabular-nums">
                  {formatarMoeda(linha.precoCentavos)}
                </td>
                <td className="border-hairline-light text-charcoal border-b px-3 py-2 text-right tabular-nums">
                  {formatarMoeda(brutoDaLinha(linha))}
                </td>
                <td
                  className={`border-hairline-light border-b px-3 py-2 text-right tabular-nums ${
                    linha.descontoCentavos ? 'text-[#b3242f]' : 'text-stone'
                  }`}
                >
                  {formatarMoeda(linha.descontoCentavos)}
                </td>
                <td className="border-hairline-light text-ink border-b px-3 py-2 text-right font-semibold tabular-nums">
                  {formatarMoeda(liquidoDaLinha(linha))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {linhas.length === 0 ? (
        <p className="text-body-sm text-stone flex flex-col items-center gap-2 px-6 py-14 text-center">
          <ShoppingBasket size={28} aria-hidden="true" className="text-faint" />
          {vazio}
        </p>
      ) : null}
    </div>
  );
}
