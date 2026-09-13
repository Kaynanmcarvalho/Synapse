import type { PainelDeAnaliseDeCredito, PedidoDeVenda } from '@synapse/types';
import { useCallback, useState } from 'react';
import { buscarPedido, liberarPedidos, observarPedido } from './analise.api';

type Resultado = { readonly mensagem: string; readonly tom: 'sucesso' | 'alerta' } | null;

const plural = (quantos: number, um: string, varios: string) => (quantos === 1 ? um : varios);

/** O que acontece dentro da ficha: quais pedidos estao marcados, qual pedido
 *  esta aberto na janela de detalhe e a liberacao em lote. */
export const useFichaDoCliente = (
  dados: PainelDeAnaliseDeCredito | null,
  aoMudarPedidos: () => void,
) => {
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set());
  const [pedidoAberto, setPedidoAberto] = useState<PedidoDeVenda | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [resultado, setResultado] = useState<Resultado>(null);

  const alternarSelecao = useCallback((id: string) => {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (!proximos.delete(id)) proximos.add(id);
      return proximos;
    });
  }, []);

  const selecionarTodos = useCallback(
    (marcar: boolean) =>
      setSelecionados(new Set(marcar ? (dados?.pedidosEmAnalise ?? []).map((p) => p.id) : [])),
    [dados],
  );

  /** Abre o pedido pelo objeto (ja carregado na ficha) ou pelo id (lupa de um
   *  titulo ou nota), buscando so quando a ficha nao tem ele em maos. */
  const abrirPedido = useCallback(
    async (alvo: PedidoDeVenda | string): Promise<boolean> => {
      if (typeof alvo !== 'string') {
        setPedidoAberto(alvo);
        return true;
      }
      const conhecido = [...(dados?.pedidosEmAnalise ?? []), ...(dados?.ultimosPedidos ?? [])].find(
        (pedido) => pedido.id === alvo,
      );
      setPedidoAberto(conhecido ?? (await buscarPedido(alvo)));
      return true;
    },
    [dados],
  );

  const observar = useCallback(
    async (texto: string) => {
      if (!pedidoAberto) return;
      setPedidoAberto(await observarPedido(pedidoAberto.id, texto));
      aoMudarPedidos();
    },
    [pedidoAberto, aoMudarPedidos],
  );

  const liberar = useCallback(async () => {
    const ids = [...selecionados];
    if (ids.length === 0) return;
    setLiberando(true);
    try {
      const { liberados, recusados } = await liberarPedidos(ids);
      setSelecionados(new Set());
      const partes = [
        liberados.length > 0 &&
          `${liberados.length} ${plural(liberados.length, 'pedido liberado e enviado', 'pedidos liberados e enviados')} ao faturamento.`,
        ...recusados.map((recusa) => recusa.motivo),
      ].filter(Boolean);
      setResultado({ mensagem: partes.join(' '), tom: recusados.length ? 'alerta' : 'sucesso' });
      aoMudarPedidos();
    } catch (erro) {
      setResultado({
        mensagem: erro instanceof Error ? erro.message : 'Não foi possível liberar os pedidos.',
        tom: 'alerta',
      });
    } finally {
      setLiberando(false);
    }
  }, [selecionados, aoMudarPedidos]);

  return {
    selecionados,
    setSelecionados,
    alternarSelecao,
    selecionarTodos,
    pedidoAberto,
    abrirPedido,
    observar,
    liberar,
    liberando,
    resultado,
    fecharResultado: () => setResultado(null),
  };
};
