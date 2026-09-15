import { Modal, useOverlayClose } from '@synapse/ui';
import { X } from 'lucide-react';
import type { CashSession } from '@synapse/types';
import type { ReactNode } from 'react';
import { BOTAO_CLARO } from '../../cadastros/comum/estilos';
import { formatarMoeda } from '../../customers/formato';

/** Onde o PDV é desenhado: numa janela grande por cima do sistema (Venda PDV
 *  Balcão) ou na página (Venda PDV NFC-e). O conteúdo é o mesmo nos dois. */

function Cabecalho({
  titulo,
  detalhe,
  comFechar,
}: {
  readonly titulo: string;
  readonly detalhe: ReactNode;
  readonly comFechar: boolean;
}) {
  const fechar = useOverlayClose();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
          Vendas · {titulo}
        </p>
        <h1 className="font-display text-heading-md text-ink">PDV</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {detalhe ? <div className="text-body-sm text-stone">{detalhe}</div> : null}
        {comFechar ? (
          <button type="button" onClick={fechar} className={BOTAO_CLARO}>
            <X size={15} aria-hidden="true" /> (Esc) Sair
          </button>
        ) : null}
      </div>
    </header>
  );
}

/** Filial, hora da abertura do caixa e o dinheiro que deve estar na gaveta. */
export function DetalheDoCaixa({
  filial,
  caixa,
}: {
  readonly filial: string;
  readonly caixa: CashSession;
}) {
  const abertoAs = new Date(caixa.openedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <>
      {filial} · caixa aberto às {abertoAs} · na gaveta{' '}
      <strong className="text-ink tabular-nums">{formatarMoeda(caixa.expectedCash)}</strong>
    </>
  );
}

export function MolduraDoPdv({
  emJanela,
  titulo,
  detalhe,
  aoFechar,
  children,
}: {
  readonly emJanela: boolean;
  readonly titulo: string;
  readonly detalhe?: ReactNode;
  readonly aoFechar: () => void;
  readonly children: ReactNode;
}) {
  if (!emJanela) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1500px] flex-col gap-3 px-4 py-4">
        <Cabecalho titulo={titulo} detalhe={detalhe} comFechar={false} />
        {children}
      </main>
    );
  }
  return (
    <Modal
      onClose={aoFechar}
      label={titulo}
      size="full"
      bare
      closeOnBackdrop={false}
      className="sm:h-[95vh] sm:max-h-[95vh] sm:max-w-[1500px]"
    >
      <div className="border-hairline-light border-b bg-white px-5 py-3">
        <Cabecalho titulo={titulo} detalhe={detalhe} comFechar />
      </div>
      <div className="bg-surface-soft flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {children}
      </div>
    </Modal>
  );
}
