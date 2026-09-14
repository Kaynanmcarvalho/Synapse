import type { Product } from '@synapse/types';
import { formatarData } from '../../customers/formato';
import { ListaDeProdutos, type ProdutoDaLista } from './ListaDeProdutos';
import { buscarProdutos, sugestoesDoCliente } from './vendas.api';

/** Qual lista de produtos abrir: a busca do catálogo (F12 / Produto), os
 *  similares (mesma categoria do item) ou as sugestões do cliente. */
export type ListaPedida =
  | { readonly tipo: 'busca'; readonly termo: string }
  | {
      readonly tipo: 'similar';
      readonly categoriaId: string;
      readonly semProduto: string;
      readonly nome: string;
    }
  | { readonly tipo: 'sugestao'; readonly customerId: string; readonly cliente: string };

const doCatalogo = async (termo: string, categoriaId: string | null = null) =>
  (await buscarProdutos(termo, { categoryId: categoriaId, limite: 40 })).items.map(
    (produto): ProdutoDaLista => ({ produto }),
  );

export function JanelaDeProdutos({
  lista,
  aoEscolher,
  aoFechar,
}: {
  readonly lista: ListaPedida;
  readonly aoEscolher: (produto: Product) => void;
  readonly aoFechar: () => void;
}) {
  if (lista.tipo === 'similar') {
    return (
      <ListaDeProdutos
        titulo="Similares"
        descricao={`Da mesma categoria de ${lista.nome}`}
        carregar={async (termo) =>
          (await doCatalogo(termo, lista.categoriaId)).filter(
            (item) => item.produto.id !== lista.semProduto,
          )
        }
        aoEscolher={aoEscolher}
        aoFechar={aoFechar}
      />
    );
  }
  if (lista.tipo === 'sugestao') {
    return (
      <ListaDeProdutos
        titulo="Sugestão"
        descricao={`O que ${lista.cliente} mais compra`}
        comBusca={false}
        carregar={async () =>
          (await sugestoesDoCliente(lista.customerId)).map((sugestao) => ({
            produto: sugestao.produto,
            detalhe: `comprou ${sugestao.vezes}x · última em ${formatarData(sugestao.ultimaCompraEm)}`,
          }))
        }
        aoEscolher={aoEscolher}
        aoFechar={aoFechar}
      />
    );
  }
  return (
    <ListaDeProdutos
      titulo="Produtos"
      termoInicial={lista.termo}
      carregar={(termo) => doCatalogo(termo)}
      aoEscolher={aoEscolher}
      aoFechar={aoFechar}
    />
  );
}
