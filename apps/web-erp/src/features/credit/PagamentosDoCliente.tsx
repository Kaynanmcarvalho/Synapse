import type { CarteiraDoCliente } from '@synapse/types';
import { Cartao, Total, Vazio } from './Cartao';
import { BotaoLupa, Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from './Tabela';
import { descricaoDoPagamento, formatarData, formatarMoeda } from './analise';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Título' },
  { rotulo: 'Série', alinhamento: 'centro', largura: '64px' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'Dias', alinhamento: 'centro', largura: '64px' },
  { rotulo: '', alinhamento: 'centro', largura: '48px' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

const corDosDias = (dias: number): string =>
  dias > 0 ? 'text-accent-danger font-semibold' : dias < 0 ? 'text-accent-teal font-semibold' : '';

/** Canto inferior direito: como o cliente paga. Um titulo pago em duas vezes
 *  aparece duas vezes — e o comportamento de pagamento, e nao o saldo. */
export function PagamentosDoCliente({
  carteira,
  aoAbrirPedido,
}: {
  readonly carteira: CarteiraDoCliente;
  readonly aoAbrirPedido: (pedidoId: string) => void;
}) {
  const { pagamentos, totalPagoCentavos } = carteira;

  return (
    <Cartao
      titulo="Títulos pagos"
      acao={<span className="text-body-sm text-stone">{pagamentos.length} pagamento(s)</span>}
      rodape={
        <Total
          rotulo="Total pago"
          valor={formatarMoeda(totalPagoCentavos)}
          tom={totalPagoCentavos > 0 ? 'positivo' : 'neutro'}
        />
      }
    >
      {pagamentos.length === 0 ? (
        <Vazio texto="Nenhum pagamento registrado." />
      ) : (
        <Tabela colunas={COLUNAS} larguraMinima={440}>
          {pagamentos.map((pagamento, indice) => {
            const pedidoId = pagamento.pedidoId;
            return (
              <LinhaDaTabela key={`${pagamento.tituloId}-${pagamento.pagoEm}-${indice}`}>
                <Celula coluna={coluna(0)} forte>
                  {pagamento.numero}
                </Celula>
                <Celula coluna={coluna(1)}>{pagamento.serie}</Celula>
                <Celula coluna={coluna(2)}>{formatarData(pagamento.vencimento)}</Celula>
                <Celula coluna={coluna(3)} forte>
                  {formatarMoeda(pagamento.valorCentavos)}
                </Celula>
                <Celula coluna={coluna(4)}>
                  <span
                    className={corDosDias(pagamento.diasDoPagamento)}
                    title={`Pago em ${formatarData(pagamento.pagoEm)} — ${descricaoDoPagamento(pagamento.diasDoPagamento)}`}
                  >
                    {pagamento.diasDoPagamento}
                  </span>
                </Celula>
                <Celula coluna={coluna(5)}>
                  <BotaoLupa
                    rotulo={`Abrir o pedido do título ${pagamento.numero}`}
                    aoAbrir={pedidoId ? () => aoAbrirPedido(pedidoId) : null}
                  />
                </Celula>
              </LinhaDaTabela>
            );
          })}
        </Tabela>
      )}
    </Cartao>
  );
}
