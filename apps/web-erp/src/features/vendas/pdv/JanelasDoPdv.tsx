/* eslint-disable max-lines-per-function */
import type { CashSession, PosSale, Product } from '@synapse/types';
import { JanelaDeDesconto } from '../comum/JanelaDeDesconto';
import { JanelaDeProdutos, type ListaPedida } from '../comum/JanelaDeProdutos';
import { JanelaDeTexto } from '../comum/JanelaDeTexto';
import type { LinhaDaVenda } from '../comum/itens';
import type { VendaEmAndamento } from '../comum/useVendaEmAndamento';
import { impressaoDaVenda } from '../comum/vendas.api';
import { JanelaDeImpressao } from '../impressao/JanelaDeImpressao';
import type { ClienteDoPdv } from './clienteDoPdv';
import { FinalizarVenda } from './FinalizarVenda';
import { InformarCliente } from './InformarCliente';
import { OutrosRecursos } from './OutrosRecursos';
import { ProdutoPesavel } from './ProdutoPesavel';
import { VendaConcluida } from './VendaConcluida';
import { VendasDoCaixa, type UsoDaLista } from './VendasDoCaixa';

/** As janelas do PDV. Uma de cada vez, por cima da venda. */
export type JanelaDoPdv =
  | { readonly tipo: 'produtos'; readonly lista: ListaPedida }
  | {
      readonly tipo:
        'cliente' | 'desconto' | 'lote' | 'serie' | 'mesa' | 'pesavel' | 'outros' | 'finalizar';
    }
  | { readonly tipo: 'vendas'; readonly uso: UsoDaLista }
  | { readonly tipo: 'impressao'; readonly vendaId: string }
  | { readonly tipo: 'concluida'; readonly venda: PosSale };

export interface AcoesDasJanelas {
  readonly fechar: () => void;
  readonly abrir: (janela: JanelaDoPdv) => void;
  readonly escolherProduto: (produto: Product) => void;
  readonly informarCliente: (cliente: ClienteDoPdv) => void;
  readonly informarMesa: (mesa: string | null) => void;
  readonly lancar: (linha: LinhaDaVenda) => void;
  readonly concluir: (venda: PosSale) => void;
  readonly imprimir: (venda: PosSale) => void;
  /** NFC-e abre o DANFE; balcão abre o pedido para imprimir. */
  readonly reimprimir: (venda: PosSale) => void;
  readonly copiar: (venda: PosSale) => void;
  readonly atualizarCaixa: (caixa: CashSession) => void;
  readonly caixaFechado: (caixa: CashSession) => void;
  readonly vendaCancelada: () => void;
  readonly acionarGaveta: () => void;
}

// eslint-disable-next-line complexity -- um caso por janela, sem regra de negócio
export function JanelasDoPdv({
  janela,
  modo,
  caixa,
  filialId,
  venda,
  cliente,
  vendedor,
  mesaOuCartao,
  ultima,
  acoes,
}: {
  readonly janela: JanelaDoPdv | null;
  readonly modo: 'NFCE' | 'BALCAO';
  readonly caixa: CashSession;
  readonly filialId: string;
  readonly venda: VendaEmAndamento;
  readonly cliente: ClienteDoPdv;
  readonly vendedor: { readonly id: string; readonly descontoMaximoPercentual: number } | null;
  readonly mesaOuCartao: string | null;
  readonly ultima: PosSale | null;
  readonly acoes: AcoesDasJanelas;
}) {
  const linha = venda.linhaSelecionada;
  switch (janela?.tipo) {
    case 'produtos':
      return (
        <JanelaDeProdutos
          lista={janela.lista}
          aoEscolher={acoes.escolherProduto}
          aoFechar={acoes.fechar}
        />
      );
    case 'cliente':
      return (
        <InformarCliente
          atual={cliente}
          aoInformar={acoes.informarCliente}
          aoFechar={acoes.fechar}
        />
      );
    case 'desconto':
      return (
        <JanelaDeDesconto
          linhas={venda.linhas}
          selecionada={venda.selecionada}
          limitePercentual={vendedor?.descontoMaximoPercentual ?? null}
          aoAplicar={(linhas) => {
            venda.substituirTodas(linhas);
            acoes.fechar();
          }}
          aoFechar={acoes.fechar}
        />
      );
    case 'lote':
    case 'serie':
      return linha ? (
        <JanelaDeTexto
          titulo={janela.tipo === 'lote' ? 'Lote' : 'Série'}
          rotulo={`${janela.tipo === 'lote' ? 'Lote' : 'Número de série'} de ${linha.descricao}`}
          valorInicial={(janela.tipo === 'lote' ? linha.lote : linha.serie) ?? ''}
          aoConfirmar={(texto) => {
            venda.atualizar(linha.chave, { [janela.tipo]: texto || null });
            acoes.fechar();
          }}
          aoFechar={acoes.fechar}
        />
      ) : null;
    case 'mesa':
      return (
        <JanelaDeTexto
          titulo="Mesa / Cartão"
          rotulo="Número da mesa ou do cartão (vazio tira)"
          valorInicial={mesaOuCartao ?? ''}
          maximo={20}
          aoConfirmar={(texto) => acoes.informarMesa(texto || null)}
          aoFechar={acoes.fechar}
        />
      );
    case 'pesavel':
      return (
        <ProdutoPesavel
          filialId={filialId}
          customerId={cliente.customerId}
          aoLancar={acoes.lancar}
          aoFechar={acoes.fechar}
        />
      );
    case 'outros':
      return (
        <OutrosRecursos
          caixa={caixa}
          temUltimaVenda={Boolean(ultima)}
          aoAtualizarCaixa={acoes.atualizarCaixa}
          aoFecharCaixa={acoes.caixaFechado}
          aoReimprimir={() => ultima && acoes.reimprimir(ultima)}
          aoFechar={acoes.fechar}
        />
      );
    case 'finalizar':
      return (
        <FinalizarVenda
          modo={modo}
          caixaId={caixa.id}
          totalCentavos={venda.totais.liquidoCentavos}
          linhas={venda.linhas}
          cliente={cliente}
          funcionarioId={vendedor?.id ?? null}
          mesaOuCartao={mesaOuCartao}
          aoConcluir={acoes.concluir}
          aoFechar={acoes.fechar}
        />
      );
    case 'vendas':
      return (
        <VendasDoCaixa
          uso={janela.uso}
          caixaId={caixa.id}
          aoImprimir={acoes.imprimir}
          aoCopiar={acoes.copiar}
          aoCancelada={acoes.vendaCancelada}
          aoFechar={acoes.fechar}
        />
      );
    case 'impressao':
      return (
        <JanelaDeImpressao
          key={janela.vendaId}
          carregar={() => impressaoDaVenda(janela.vendaId)}
          aoFechar={acoes.fechar}
        />
      );
    case 'concluida':
      return (
        <VendaConcluida
          venda={janela.venda}
          aoImprimir={() => acoes.reimprimir(janela.venda)}
          aoAcionarGaveta={acoes.acionarGaveta}
          aoFechar={acoes.fechar}
        />
      );
    default:
      return null;
  }
}
