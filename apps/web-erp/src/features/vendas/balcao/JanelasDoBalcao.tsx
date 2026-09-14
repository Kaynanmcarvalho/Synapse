import type { ClienteNaLista, PedidoDeVenda, Product } from '@synapse/types';
import { BuscaDeCliente } from '../comum/BuscaDeCliente';
import { JanelaDeDesconto } from '../comum/JanelaDeDesconto';
import { JanelaDeProdutos, type ListaPedida } from '../comum/JanelaDeProdutos';
import { JanelaDeTexto } from '../comum/JanelaDeTexto';
import type { VendaEmAndamento } from '../comum/useVendaEmAndamento';
import { impressaoDoPedidoDeBalcao } from '../comum/vendas.api';
import { JanelaDeImpressao } from '../impressao/JanelaDeImpressao';
import { HistoricoDoBalcao } from './HistoricoDoBalcao';

/** As janelas que o Ponto de Vendas abre por cima da venda. Uma de cada vez. */
export type JanelaDoBalcao =
  | { readonly tipo: 'produtos'; readonly lista: ListaPedida }
  | { readonly tipo: 'cliente' | 'desconto' | 'lote' | 'historico' }
  | { readonly tipo: 'impressao'; readonly pedidoId: string };

export function JanelasDoBalcao({
  janela,
  venda,
  limiteDeDesconto,
  vendedorId,
  aoFechar,
  aoAbrir,
  aoEscolherProduto,
  aoEscolherCliente,
  aoCopiarPedido,
}: {
  readonly janela: JanelaDoBalcao | null;
  readonly venda: VendaEmAndamento;
  readonly limiteDeDesconto: number | null;
  readonly vendedorId: string | null;
  readonly aoFechar: () => void;
  readonly aoAbrir: (janela: JanelaDoBalcao) => void;
  readonly aoEscolherProduto: (produto: Product) => void;
  readonly aoEscolherCliente: (cliente: ClienteNaLista) => void;
  readonly aoCopiarPedido: (pedido: PedidoDeVenda) => void;
}) {
  const linha = venda.linhaSelecionada;
  switch (janela?.tipo) {
    case 'produtos':
      return (
        <JanelaDeProdutos lista={janela.lista} aoEscolher={aoEscolherProduto} aoFechar={aoFechar} />
      );
    case 'cliente':
      return <BuscaDeCliente aoEscolher={aoEscolherCliente} aoFechar={aoFechar} />;
    case 'desconto':
      return (
        <JanelaDeDesconto
          linhas={venda.linhas}
          selecionada={venda.selecionada}
          limitePercentual={limiteDeDesconto}
          aoAplicar={(linhas) => {
            venda.substituirTodas(linhas);
            aoFechar();
          }}
          aoFechar={aoFechar}
        />
      );
    case 'lote':
      return linha ? (
        <JanelaDeTexto
          titulo="Lote"
          rotulo={`Lote de ${linha.descricao}`}
          valorInicial={linha.lote ?? ''}
          aoConfirmar={(lote) => {
            venda.atualizar(linha.chave, { lote: lote || null });
            aoFechar();
          }}
          aoFechar={aoFechar}
        />
      ) : null;
    case 'historico':
      return (
        <HistoricoDoBalcao
          vendedorId={vendedorId}
          aoImprimir={(pedido) => aoAbrir({ tipo: 'impressao', pedidoId: pedido.id })}
          aoCopiar={aoCopiarPedido}
          aoFechar={aoFechar}
        />
      );
    case 'impressao':
      return (
        <JanelaDeImpressao
          key={janela.pedidoId}
          carregar={() => impressaoDoPedidoDeBalcao(janela.pedidoId)}
          aoFechar={aoFechar}
        />
      );
    default:
      return null;
  }
}
