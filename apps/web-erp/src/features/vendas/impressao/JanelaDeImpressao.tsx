/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { ImpressaoDoPedido } from '@synapse/types';
import { LoaderCircle, Printer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BOTAO_CLARO, BOTAO_ESCURO } from '../../cadastros/comum/estilos';
import { useAtalhosDaTela } from '../comum/useAtalhosDaTela';
import { FolhaDoPedido } from './FolhaDoPedido';

/** Visualiza e imprime o pedido de venda. A folha vai para um nó fora do app
 *  e o CSS de impressão esconde todo o resto só enquanto imprime. */
export function JanelaDeImpressao({
  carregar,
  imprimirAoAbrir = false,
  aoFechar,
}: {
  readonly carregar: () => Promise<ImpressaoDoPedido>;
  readonly imprimirAoAbrir?: boolean;
  readonly aoFechar: () => void;
}) {
  const [pedido, setPedido] = useState<ImpressaoDoPedido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregarAtual = useRef(carregar);
  const jaImprimiu = useRef(false);

  useEffect(() => {
    let vivo = true;
    carregarAtual
      .current()
      .then((lido) => {
        if (vivo) setPedido(lido);
      })
      .catch((falha: unknown) => {
        if (vivo)
          setErro(falha instanceof Error ? falha.message : 'Não foi possível montar o pedido');
      });
    return () => {
      vivo = false;
    };
  }, []);

  const imprimir = useCallback(() => {
    if (!pedido) return;
    document.body.classList.add('imprimindo');
    const terminar = () => {
      document.body.classList.remove('imprimindo');
      window.removeEventListener('afterprint', terminar);
    };
    window.addEventListener('afterprint', terminar);
    window.print();
  }, [pedido]);

  useEffect(() => {
    if (!pedido || !imprimirAoAbrir || jaImprimiu.current) return;
    jaImprimiu.current = true;
    window.requestAnimationFrame(imprimir);
  }, [pedido, imprimirAoAbrir, imprimir]);

  useAtalhosDaTela({ 'Ctrl+P': imprimir }, true);

  return (
    <>
      <Modal
        onClose={aoFechar}
        title={pedido ? `Pedido de venda nº ${pedido.numero}` : 'Pedido de venda'}
        description="Sem valor fiscal"
        size="full"
        bodyClassName="bg-surface-soft"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
              (Esc) Fechar
            </button>
            <button type="button" onClick={imprimir} disabled={!pedido} className={BOTAO_ESCURO}>
              <Printer size={15} aria-hidden="true" /> (Ctrl+P) Imprimir
            </button>
          </div>
        }
      >
        {erro ? <p className="text-body-sm py-10 text-center text-[#b3242f]">{erro}</p> : null}
        {!pedido && !erro ? (
          <p className="text-body-sm text-stone flex items-center justify-center gap-2 py-16">
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> Montando o
            pedido…
          </p>
        ) : null}
        {pedido ? (
          <div className="overflow-x-auto py-2">
            <div className="shadow-cartao mx-auto w-fit">
              <FolhaDoPedido pedido={pedido} />
            </div>
          </div>
        ) : null}
      </Modal>
      {pedido
        ? createPortal(
            <div id="area-de-impressao">
              <FolhaDoPedido pedido={pedido} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
