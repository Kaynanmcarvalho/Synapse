/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import { useEffect, useRef, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { formatarMoeda, lerMoeda } from '../../customers/formato';
import { simularDesconto, type Desconto, type LinhaDaVenda } from './itens';

/** Desc.: desconto em percentual ou em reais, no item escolhido ou no
 *  documento inteiro. Mostra o limite do vendedor antes de mandar para a API,
 *  que confere de novo. */
export function JanelaDeDesconto({
  linhas,
  selecionada,
  limitePercentual,
  aoAplicar,
  aoFechar,
}: {
  readonly linhas: readonly LinhaDaVenda[];
  readonly selecionada: string | null;
  readonly limitePercentual: number | null;
  readonly aoAplicar: (linhas: LinhaDaVenda[]) => void;
  readonly aoFechar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const linha = linhas.find((item) => item.chave === selecionada) ?? null;
  const [alvo, setAlvo] = useState<'linha' | 'documento'>(linha ? 'linha' : 'documento');
  const [tipo, setTipo] = useState<Desconto['tipo']>('percentual');
  const [texto, setTexto] = useState('');

  useEffect(() => campo.current?.focus(), [tipo, alvo]);

  const numero =
    tipo === 'percentual' ? Number(texto.replace(',', '.')) || 0 : lerMoeda(texto || '0');
  const desconto: Desconto = { tipo, valor: numero };
  const simulacao = simularDesconto(linhas, alvo === 'linha' ? linha : null, desconto);
  const { totais, invalido, percentual: percentualFinal } = simulacao;
  const acimaDoLimite = limitePercentual !== null && percentualFinal > limitePercentual + 1e-9;

  const aplicar = () => {
    if (!invalido) aoAplicar(simulacao.linhas);
  };

  return (
    <Modal
      onClose={aoFechar}
      title="Desconto"
      description={linha ? `${linha.codigo} - ${linha.descricao}` : 'Desconto no documento'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
            (Esc) Cancelar
          </button>
          <button type="button" onClick={aplicar} disabled={invalido} className={BOTAO_ESCURO}>
            (Enter) Aplicar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <fieldset className="bg-surface-soft inline-flex rounded-full p-1">
            <legend className="sr-only">Onde aplicar</legend>
            {(['linha', 'documento'] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                disabled={opcao === 'linha' && !linha}
                aria-pressed={alvo === opcao}
                onClick={() => setAlvo(opcao)}
                className={`text-button-sm h-8 rounded-full px-3 transition disabled:opacity-40 ${
                  alvo === opcao ? 'text-ink bg-white shadow-sm' : 'text-mute'
                }`}
              >
                {opcao === 'linha' ? 'No item' : 'No documento'}
              </button>
            ))}
          </fieldset>
          <fieldset className="bg-surface-soft inline-flex rounded-full p-1">
            <legend className="sr-only">Tipo de desconto</legend>
            {(['percentual', 'valor'] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={tipo === opcao}
                onClick={() => {
                  setTipo(opcao);
                  setTexto('');
                }}
                className={`text-button-sm h-8 rounded-full px-3 transition ${
                  tipo === opcao ? 'text-ink bg-white shadow-sm' : 'text-mute'
                }`}
              >
                {opcao === 'percentual' ? '%' : 'R$'}
              </button>
            ))}
          </fieldset>
        </div>
        <label className="block">
          <span className="text-caption text-charcoal mb-1.5 block font-medium">
            {tipo === 'percentual' ? 'Percentual de desconto' : 'Valor do desconto (R$)'}
          </span>
          <input
            ref={campo}
            inputMode="decimal"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value.replace(/[^\d,]/g, ''))}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault();
                aplicar();
              }
            }}
            placeholder="0,00"
            className={`${INPUT_DE_BUSCA} text-right tabular-nums`}
          />
        </label>
        <dl className="text-body-sm grid grid-cols-2 gap-y-1">
          <dt className="text-stone">Total bruto</dt>
          <dd className="text-right tabular-nums">{formatarMoeda(totais.brutoCentavos)}</dd>
          <dt className="text-stone">Descontos</dt>
          <dd className="text-right tabular-nums text-[#b3242f]">
            {formatarMoeda(totais.descontosCentavos)} (
            {percentualFinal.toFixed(2).replace('.', ',')}
            %)
          </dd>
          <dt className="text-ink font-semibold">Total líquido</dt>
          <dd className="text-right font-semibold tabular-nums">
            {formatarMoeda(totais.liquidoCentavos)}
          </dd>
        </dl>
        {invalido ? (
          <p className="text-caption text-[#b3242f]">Desconto maior que o valor dos itens.</p>
        ) : null}
        {acimaDoLimite ? (
          <p className="text-caption rounded-xl bg-[#fff3e0] px-3 py-2 text-[#8a4b00]">
            Passa do limite de {limitePercentual}% do vendedor: a venda será recusada ao fechar.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
