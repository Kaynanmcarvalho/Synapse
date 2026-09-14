/* eslint-disable max-lines-per-function */
import type { CashSession } from '@synapse/types';
import { LoaderCircle, LockOpen } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { formatarMoeda, lerMoeda } from '../../customers/formato';
import type { Filial } from '../comum/vendas.api';
import { abrirCaixa } from '../comum/vendas.api';

/** Antes da primeira venda: o caixa do operador nesta filial, com o fundo de
 *  troco que está na gaveta. */
export function AberturaDeCaixa({
  titulo,
  filiais,
  filialId,
  aoEscolherFilial,
  fechamento,
  aoAbrir,
}: {
  readonly titulo: string;
  readonly filiais: readonly Filial[];
  readonly filialId: string;
  readonly aoEscolherFilial: (id: string) => void;
  readonly fechamento: CashSession | null;
  readonly aoAbrir: (caixa: CashSession) => void;
}) {
  const ids = { filial: useId(), valor: useId() };
  const campo = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => campo.current?.focus(), []);

  const abrir = async () => {
    setAbrindo(true);
    setErro(null);
    try {
      aoAbrir(await abrirCaixa(filialId, lerMoeda(valor)));
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o caixa');
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      {fechamento ? (
        <section className="border-hairline-light rounded-2xl border bg-white p-4">
          <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
            Caixa fechado
          </p>
          <dl className="text-body-sm mt-2 grid grid-cols-2 gap-y-1">
            <dt className="text-stone">Esperado em dinheiro</dt>
            <dd className="text-right tabular-nums">{formatarMoeda(fechamento.expectedCash)}</dd>
            <dt className="text-stone">Contado</dt>
            <dd className="text-right tabular-nums">
              {formatarMoeda(fechamento.countedCash ?? 0)}
            </dd>
            <dt className="text-ink font-semibold">Diferença</dt>
            <dd
              className={`text-right font-semibold tabular-nums ${
                (fechamento.difference ?? 0) < 0
                  ? 'text-[#b3242f]'
                  : (fechamento.difference ?? 0) > 0
                    ? 'text-[#8a4b00]'
                    : 'text-[#00664d]'
              }`}
            >
              {formatarMoeda(fechamento.difference ?? 0)}
            </dd>
          </dl>
        </section>
      ) : null}

      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          void abrir();
        }}
        className="border-hairline-light shadow-cartao flex flex-col gap-4 rounded-3xl border bg-white p-6"
      >
        <div className="flex items-center gap-3">
          <span className="bg-surface-soft text-ink flex h-11 w-11 items-center justify-center rounded-full">
            <LockOpen size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-caption text-stone font-semibold uppercase tracking-[0.12em]">
              {titulo}
            </p>
            <h1 className="font-display text-heading-sm text-ink">Abrir caixa</h1>
          </div>
        </div>
        {filiais.length > 1 ? (
          <div>
            <label
              htmlFor={ids.filial}
              className="text-caption text-charcoal mb-1 block font-medium"
            >
              Filial
            </label>
            <select
              id={ids.filial}
              value={filialId}
              onChange={(evento) => aoEscolherFilial(evento.target.value)}
              className={INPUT_DE_BUSCA}
            >
              {filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label htmlFor={ids.valor} className="text-caption text-charcoal mb-1 block font-medium">
            Fundo de troco (R$)
          </label>
          <input
            id={ids.valor}
            ref={campo}
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value.replace(/[^\d,]/g, ''))}
            placeholder="0,00"
            className={`${INPUT_DE_BUSCA} text-right text-lg tabular-nums`}
          />
        </div>
        {erro ? <p className="text-body-sm text-[#b3242f]">{erro}</p> : null}
        <button type="submit" disabled={abrindo} className={`${BOTAO_ESCURO} justify-center`}>
          {abrindo ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : null}
          (Enter) Abrir caixa
        </button>
      </form>
    </main>
  );
}
