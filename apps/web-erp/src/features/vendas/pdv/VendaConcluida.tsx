import { Modal } from '@synapse/ui';
import type { PosSale } from '@synapse/types';
import { CheckCircle2, FileText, Printer } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO } from '../../cadastros/comum/estilos';
import { formatarMoeda } from '../../customers/formato';
import { useAtalhosDaTela } from '../comum/useAtalhosDaTela';

/** Depois do F3: o troco em letra grande, a NFC-e ou o pedido para imprimir
 *  (Enter) e a gaveta (F4). Esc volta para a próxima venda. */
export function VendaConcluida({
  venda,
  aoImprimir,
  aoAcionarGaveta,
  aoFechar,
}: {
  readonly venda: PosSale;
  readonly aoImprimir: () => void;
  readonly aoAcionarGaveta: () => void;
  readonly aoFechar: () => void;
}) {
  const botao = useRef<HTMLButtonElement>(null);
  const pago = venda.payments.reduce((soma, pagamento) => soma + pagamento.amount, 0);
  const troco = venda.trocoCentavos ?? 0;
  const fiscal = Boolean(venda.nfceDocumentId);

  useEffect(() => botao.current?.focus(), []);
  useAtalhosDaTela({ F4: aoAcionarGaveta, F8: fiscal ? aoImprimir : undefined }, true);

  return (
    <Modal
      onClose={aoFechar}
      label="Venda concluída"
      size="md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={aoAcionarGaveta} className={BOTAO_CLARO}>
            (F4) Gaveta
          </button>
          <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
            (Esc) Nova venda
          </button>
          <button ref={botao} type="button" onClick={aoImprimir} className={BOTAO_ESCURO}>
            {fiscal ? (
              <FileText size={15} aria-hidden="true" />
            ) : (
              <Printer size={15} aria-hidden="true" />
            )}
            (Enter) {fiscal ? 'Imprimir NFC-e' : 'Imprimir pedido'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <CheckCircle2 size={34} aria-hidden="true" className="text-[#00a37a]" />
        <p className="text-body-sm text-stone">
          Venda nº <strong className="text-ink">{venda.numero}</strong>
          {fiscal ? ' · NFC-e emitida' : ' · sem valor fiscal'}
        </p>
        <p className="text-caption text-stone mt-2">Troco</p>
        <p className="font-display text-display-md text-ink tabular-nums">{formatarMoeda(troco)}</p>
        <dl className="text-body-sm mt-2 grid w-full max-w-xs grid-cols-2 gap-y-1">
          <dt className="text-stone text-left">Total</dt>
          <dd className="text-right tabular-nums">{formatarMoeda(venda.total)}</dd>
          <dt className="text-stone text-left">Recebido</dt>
          <dd className="text-right tabular-nums">{formatarMoeda(pago + troco)}</dd>
        </dl>
      </div>
    </Modal>
  );
}
