/* eslint-disable max-lines-per-function */
import { CornerDownLeft, LoaderCircle, Search } from 'lucide-react';
import { useId } from 'react';
import { BOTAO_ESCURO, BOTAO_ICONE } from '../../cadastros/comum/estilos';
import { DicaDoLancamento } from './DicaDoLancamento';
import { useLancamento, type OpcoesDoLancamento } from './useLancamento';

export type { ControleDoLancamento } from './useLancamento';

/** Produto / Serviço, Quantidade e Valor Unitário. No Ponto de Vendas o Enter
 *  anda produto → quantidade → valor → lança; no PDV o código lido já lança
 *  com a quantidade do (F2). "3*789..." lança 3 de uma vez. O preço vem da
 *  regra de preço; valor digitado abaixo dele vira desconto da linha. */

const CAMPO =
  'border-hairline-light text-body-md text-ink focus:border-primary focus:ring-primary/15 h-12 w-full rounded-xl border bg-white px-3.5 outline-none transition focus:ring-4 disabled:bg-surface-soft';

export function LancamentoDeItem(opcoes: OpcoesDoLancamento) {
  const ids = { produto: useId(), quantidade: useId(), valor: useId() };
  const {
    campoProduto,
    campoQuantidade,
    campoValor,
    texto,
    setTexto,
    produto,
    setProduto,
    quantidade,
    setQuantidade,
    valor,
    setValor,
    precoDeTabela,
    setValorDigitado,
    edicao,
    ocupado,
    aviso,
    procurar,
    lancar,
  } = useLancamento(opcoes);
  const { lancarAoLerCodigo, aoBuscar } = opcoes;
  const aoTeclarEnter = (evento: { key: string; preventDefault: () => void }, acao: () => void) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    acao();
  };

  return (
    <div className="border-hairline-light rounded-2xl border bg-white p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_9rem_10rem_auto]">
        <div className="col-span-2 min-w-0 md:col-span-1">
          <label
            htmlFor={ids.produto}
            className="text-caption text-charcoal mb-1 block font-medium"
          >
            Produto / Serviço{' '}
            {edicao ? <span className="text-[#8a4b00]">· alterando item</span> : null}
          </label>
          <div className="flex gap-2">
            <input
              id={ids.produto}
              ref={campoProduto}
              value={texto}
              onChange={(evento) => {
                setTexto(evento.target.value);
                if (produto) setProduto(null);
              }}
              onKeyDown={(evento) => aoTeclarEnter(evento, () => void procurar())}
              placeholder="Código de barras, código ou descrição — Enter procura"
              autoComplete="off"
              className={CAMPO}
            />
            <button
              type="button"
              onClick={() => aoBuscar(produto ? '' : texto.trim())}
              aria-label="Procurar produto"
              className={`${BOTAO_ICONE} h-12 w-12`}
            >
              <Search size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor={ids.quantidade}
            className="text-caption text-charcoal mb-1 block font-medium"
          >
            (F2) Quantidade
          </label>
          <input
            id={ids.quantidade}
            ref={campoQuantidade}
            inputMode="decimal"
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value.replace(/[^\d,]/g, ''))}
            onKeyDown={(evento) =>
              aoTeclarEnter(evento, () => {
                if (!produto) campoProduto.current?.focus();
                else if (lancarAoLerCodigo)
                  void lancar({
                    alvo: produto,
                    textoDaQuantidade: quantidade,
                    edicaoAtual: edicao,
                  });
                else {
                  campoValor.current?.focus();
                  campoValor.current?.select();
                }
              })
            }
            className={`${CAMPO} text-right tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor={ids.valor} className="text-caption text-charcoal mb-1 block font-medium">
            Valor Unitário
          </label>
          <input
            id={ids.valor}
            ref={campoValor}
            inputMode="decimal"
            value={valor}
            disabled={!produto}
            onChange={(evento) => {
              setValor(evento.target.value.replace(/[^\d,]/g, ''));
              setValorDigitado(true);
            }}
            onKeyDown={(evento) =>
              aoTeclarEnter(
                evento,
                () =>
                  void lancar({
                    alvo: produto,
                    textoDaQuantidade: quantidade,
                    edicaoAtual: edicao,
                  }),
              )
            }
            className={`${CAMPO} text-right tabular-nums`}
          />
        </div>
        <div className="col-span-2 flex items-end md:col-span-1">
          <button
            type="button"
            onClick={() =>
              void lancar({ alvo: produto, textoDaQuantidade: quantidade, edicaoAtual: edicao })
            }
            disabled={ocupado || !produto}
            className={`${BOTAO_ESCURO} h-12 w-full justify-center md:w-auto`}
          >
            {ocupado ? (
              <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <CornerDownLeft size={15} aria-hidden="true" />
            )}
            {edicao ? 'Gravar item' : 'Lançar'}
          </button>
        </div>
      </div>
      <DicaDoLancamento
        aviso={aviso}
        produto={produto}
        precoDeTabela={precoDeTabela}
        editando={Boolean(edicao)}
        lancarAoLerCodigo={lancarAoLerCodigo}
      />
    </div>
  );
}
