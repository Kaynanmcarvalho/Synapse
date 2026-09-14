import type { Funcionario, PedidoDeVenda, ResumoDoVendedor } from '@synapse/types';

/** O mês do vendedor, calculado dos pedidos gravados — sem I/O, para o teste
 *  conferir a conta.
 *
 *  - Pedido cancelado ou reprovado não conta como venda.
 *  - Comissão a prazo usa o percentual a prazo; à vista (prazo médio zero), o à vista.
 *  - Com base "faturamento", só pedido faturado gera comissão; com "recebimento",
 *    a previsão usa tudo o que foi vendido — o recebimento de fato é do financeiro. */
export const resumirVendedor = (
  funcionario: Funcionario,
  pedidos: readonly PedidoDeVenda[],
  mes: string,
): ResumoDoVendedor => {
  const doMes = pedidos
    .filter((pedido) => pedido.enviadoEm.slice(0, 7) === mes)
    .filter((pedido) => pedido.situacao !== 'CANCELADO' && pedido.situacao !== 'REPROVADO');
  const soma = (lista: readonly PedidoDeVenda[]) =>
    lista.reduce((total, pedido) => total + pedido.totalCentavos, 0);
  const vendido = soma(doMes);
  const faturados = doMes.filter((pedido) => pedido.situacao === 'FATURADO');
  const comissionaveis = funcionario.comissao.base === 'FATURAMENTO' ? faturados : doMes;
  const comissao = comissionaveis.reduce((total, pedido) => {
    const percentual =
      pedido.prazoMedioEmDias > 0
        ? funcionario.comissao.percentualAPrazo
        : funcionario.comissao.percentualAVista;
    return total + Math.round((pedido.totalCentavos * percentual) / 100);
  }, 0);
  const situacoes = new Map<string, number>();
  for (const pedido of doMes)
    situacoes.set(pedido.situacao, (situacoes.get(pedido.situacao) ?? 0) + 1);
  const meta = funcionario.comissao.metaMensalCentavos;
  return {
    mes,
    pedidos: doMes.length,
    vendidoCentavos: vendido,
    faturadoCentavos: soma(faturados),
    ticketMedioCentavos: doMes.length ? Math.round(vendido / doMes.length) : 0,
    comissaoPrevistaCentavos: comissao,
    metaMensalCentavos: meta,
    percentualDaMeta: meta > 0 ? Number(((vendido / meta) * 100).toFixed(1)) : 0,
    clientesAtendidos: new Set(doMes.map((pedido) => pedido.customerId)).size,
    porSituacao: [...situacoes.entries()].map(([situacao, quantidade]) => ({
      situacao,
      quantidade,
    })),
  };
};
