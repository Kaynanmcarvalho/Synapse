import type { CarteiraDoCliente } from '@synapse/types';
import { Cartao, Total, Vazio } from './Cartao';
import { descricaoDoPagamento, formatarData, formatarMoeda } from './analise';

/** Canto inferior direito: como o cliente paga. Um titulo pago em duas vezes
 *  aparece duas vezes — e o comportamento de pagamento, e nao o saldo. */
export function PagamentosDoCliente({ carteira }: { readonly carteira: CarteiraDoCliente }) {
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] text-left">
            <thead>
              <tr className="text-caption text-stone">
                <th className="py-2 font-medium">Título</th>
                <th className="py-2 font-medium">Série</th>
                <th className="py-2 font-medium">Venc.</th>
                <th className="py-2 text-right font-medium">Valor</th>
                <th className="py-2 text-right font-medium">Dias</th>
              </tr>
            </thead>
            <tbody className="divide-hairline-light text-body-sm divide-y">
              {pagamentos.map((pagamento, indice) => (
                <tr key={`${pagamento.tituloId}-${pagamento.pagoEm}-${indice}`}>
                  <td className="text-ink py-2.5 pr-3 font-semibold">{pagamento.numero}</td>
                  <td className="text-charcoal py-2.5 pr-3">{pagamento.serie}</td>
                  <td className="text-charcoal py-2.5 pr-3">
                    {formatarData(pagamento.vencimento)}
                  </td>
                  <td className="text-ink py-2.5 text-right font-semibold">
                    {formatarMoeda(pagamento.valorCentavos)}
                  </td>
                  <td
                    className={`py-2.5 text-right ${
                      pagamento.diasDoPagamento > 0
                        ? 'text-accent-danger'
                        : pagamento.diasDoPagamento < 0
                          ? 'text-accent-teal'
                          : 'text-charcoal'
                    }`}
                    title={`Pago em ${formatarData(pagamento.pagoEm)} — ${descricaoDoPagamento(pagamento.diasDoPagamento)}`}
                  >
                    {pagamento.diasDoPagamento}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  );
}
