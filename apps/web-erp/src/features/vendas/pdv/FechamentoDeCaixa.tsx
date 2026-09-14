/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { CashSession } from '@synapse/types';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { formatarMoeda, lerMoeda } from '../../customers/formato';
import { fecharCaixa } from '../comum/vendas.api';
import { resumoDoCaixa } from './caixa';

/** Fecha o caixa: mostra de onde vem o dinheiro esperado na gaveta e grava o
 *  que foi contado. A diferença fica no caixa para a conferência. */

export function FechamentoDeCaixa({
  caixa,
  aoFechado,
  aoVoltar,
}: {
  readonly caixa: CashSession;
  readonly aoFechado: (caixa: CashSession) => void;
  readonly aoVoltar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [contado, setContado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const resumo = resumoDoCaixa(caixa);
  const diferenca = lerMoeda(contado) - resumo.esperado;

  useEffect(() => campo.current?.focus(), []);

  const fechar = async () => {
    if (!contado.trim()) {
      setErro('Informe quanto foi contado na gaveta');
      return;
    }
    if (!window.confirm('Fechar o caixa? Depois disso não dá para vender nele.')) return;
    setEnviando(true);
    setErro(null);
    try {
      aoFechado(await fecharCaixa(caixa.id, lerMoeda(contado)));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível fechar o caixa');
    } finally {
      setEnviando(false);
    }
  };

  const linhas: readonly (readonly [string, number])[] = [
    ['Fundo de troco', resumo.abertura],
    ['Suprimentos (+)', resumo.suprimentos],
    ['Sangrias (-)', -resumo.sangrias],
    ['Vendas em dinheiro (+)', resumo.vendasEmDinheiro],
  ];

  return (
    <Modal
      onClose={aoVoltar}
      title="Fechar caixa"
      description={`Aberto em ${new Date(caixa.openedAt).toLocaleString('pt-BR')}`}
      size="sm"
      closeOnBackdrop={false}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoVoltar} className={BOTAO_CLARO}>
            (Esc) Voltar
          </button>
          <button
            type="submit"
            form="fechamento-de-caixa"
            disabled={enviando}
            className={BOTAO_ESCURO}
          >
            {enviando ? (
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            ) : null}
            Fechar caixa
          </button>
        </div>
      }
    >
      <form
        id="fechamento-de-caixa"
        onSubmit={(evento) => {
          evento.preventDefault();
          void fechar();
        }}
        className="flex flex-col gap-4"
      >
        <dl className="text-body-sm grid grid-cols-[1fr_auto] gap-y-1">
          {linhas.map(([rotulo, centavos]) => (
            <div key={rotulo} className="contents">
              <dt className="text-stone">{rotulo}</dt>
              <dd className="text-right tabular-nums">{formatarMoeda(centavos)}</dd>
            </div>
          ))}
          <dt className="text-ink border-hairline-light mt-1 border-t pt-2 font-semibold">
            Esperado na gaveta
          </dt>
          <dd className="border-hairline-light mt-1 border-t pt-2 text-right font-semibold tabular-nums">
            {formatarMoeda(resumo.esperado)}
          </dd>
        </dl>
        <label className="block">
          <span className="text-caption text-charcoal mb-1 block font-medium">
            Dinheiro contado (R$)
          </span>
          <input
            ref={campo}
            inputMode="decimal"
            value={contado}
            onChange={(evento) => setContado(evento.target.value.replace(/[^\d,]/g, ''))}
            placeholder="0,00"
            className={`${INPUT_DE_BUSCA} h-12 text-right text-lg tabular-nums`}
          />
        </label>
        {contado.trim() ? (
          <p
            className={`text-body-sm font-semibold ${
              diferenca < 0 ? 'text-[#b3242f]' : diferenca > 0 ? 'text-[#8a4b00]' : 'text-[#00664d]'
            }`}
          >
            {diferenca === 0
              ? 'Caixa bate com o esperado'
              : `${diferenca < 0 ? 'Falta' : 'Sobra'} ${formatarMoeda(Math.abs(diferenca))}`}
          </p>
        ) : null}
        {erro ? <p className="text-caption text-[#b3242f]">{erro}</p> : null}
      </form>
    </Modal>
  );
}
