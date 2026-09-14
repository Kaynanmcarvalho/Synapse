/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type { ItemDeTabela, PosSale } from '@synapse/types';
import { CircleAlert, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BOTAO_CLARO, BOTAO_ESCURO, INPUT_DE_BUSCA } from '../../cadastros/comum/estilos';
import { escreverMoeda, formatarMoeda, lerMoeda } from '../../customers/formato';
import type { LinhaDaVenda } from '../comum/itens';
import { useAtalhosDaTela } from '../comum/useAtalhosDaTela';
import { concluirVenda, listarFormasDePagamento } from '../comum/vendas.api';
import type { ClienteDoPdv } from './clienteDoPdv';
import { documentoDaNota, resumirPagamento, type PagamentoLancado } from './pagamento';

/** F3 Finalizar Venda: as formas de pagamento da tabela (Alt+1 a Alt+9), o
 *  valor de cada uma, o que falta e o troco. Só dinheiro dá troco. */
export function FinalizarVenda({
  modo,
  caixaId,
  totalCentavos,
  linhas,
  cliente,
  funcionarioId,
  mesaOuCartao,
  aoConcluir,
  aoFechar,
}: {
  readonly modo: 'NFCE' | 'BALCAO';
  readonly caixaId: string;
  readonly totalCentavos: number;
  readonly linhas: readonly LinhaDaVenda[];
  readonly cliente: ClienteDoPdv;
  readonly funcionarioId: string | null;
  readonly mesaOuCartao: string | null;
  readonly aoConcluir: (venda: PosSale) => void;
  readonly aoFechar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [formas, setFormas] = useState<readonly ItemDeTabela[] | null>(null);
  const [forma, setForma] = useState<ItemDeTabela | null>(null);
  const [valor, setValor] = useState(escreverMoeda(totalCentavos));
  const [pagamentos, setPagamentos] = useState<readonly PagamentoLancado[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const resumo = resumirPagamento(totalCentavos, pagamentos);

  useEffect(() => {
    listarFormasDePagamento()
      .then((lista) => {
        const doPdv = lista.filter((item) => item.meio !== 'BONIFICACAO');
        setFormas(doPdv);
        setForma(doPdv[0] ?? null);
      })
      .catch((falha: unknown) => {
        setErro(falha instanceof Error ? falha.message : 'Não foi possível ler as formas');
        setFormas([]);
      });
    campo.current?.focus();
    campo.current?.select();
  }, []);

  const escolherForma = (escolhida: ItemDeTabela) => {
    setForma(escolhida);
    setErro(null);
    setValor(escreverMoeda(resumo.faltaCentavos));
    campo.current?.focus();
    campo.current?.select();
  };

  const adicionar = () => {
    const centavos = lerMoeda(valor);
    if (centavos <= 0 && resumo.faltaCentavos === 0 && pagamentos.length) {
      void concluir();
      return;
    }
    if (!forma || centavos <= 0) return;
    if ((forma.meio === 'A_PRAZO' || forma.meio === 'BOLETO') && !cliente.customerId) {
      setErro('Venda a prazo precisa do cliente do cadastro (F10)');
      return;
    }
    const passa = centavos > resumo.faltaCentavos;
    if (passa && forma.meio !== 'DINHEIRO') {
      setErro('Só dinheiro dá troco: o valor passa do que falta');
      return;
    }
    setErro(null);
    const novos = [...pagamentos, { forma, valorCentavos: centavos }];
    setPagamentos(novos);
    setValor(escreverMoeda(resumirPagamento(totalCentavos, novos).faltaCentavos));
  };

  const concluir = async () => {
    if (enviando) return;
    if (resumo.faltaCentavos > 0) {
      setErro(`Faltam ${formatarMoeda(resumo.faltaCentavos)} para fechar a venda`);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const venda = await concluirVenda(caixaId, {
        modo,
        customerId: cliente.customerId,
        customerTaxId: documentoDaNota(cliente.documento),
        clienteNome: cliente.nome,
        funcionarioId,
        mesaOuCartao,
        items: linhas.map((linha) => ({
          productId: linha.productId,
          quantity: linha.quantidade,
          discount: linha.descontoCentavos,
          surcharge: 0,
          lote: linha.lote,
          serie: linha.serie,
        })),
        payments: pagamentos.map((pagamento) => ({
          formaCodigo: pagamento.forma.codigo,
          amount: pagamento.valorCentavos,
        })),
      });
      aoConcluir(venda);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir a venda');
    } finally {
      setEnviando(false);
    }
  };

  const porNumero = Object.fromEntries(
    (formas ?? [])
      .slice(0, 9)
      .map((item, indice) => [`Alt+${indice + 1}`, () => escolherForma(item)]),
  );
  useAtalhosDaTela({ F3: () => void concluir(), ...porNumero }, true);

  return (
    <Modal
      onClose={aoFechar}
      title="Finalizar Venda"
      description={
        modo === 'NFCE' ? 'Emite a NFC-e ao concluir' : 'Pedido de venda sem valor fiscal'
      }
      size="lg"
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm min-w-0" role="status">
            {erro ? (
              <span className="flex items-center gap-2 text-[#b3242f]">
                <CircleAlert size={15} aria-hidden="true" className="shrink-0" />
                {erro}
              </span>
            ) : (
              <span className="text-stone">
                Alt+1 a Alt+9 escolhem a forma · Enter lança o valor
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
              (Esc) Voltar
            </button>
            <button
              type="button"
              onClick={() => void concluir()}
              disabled={enviando || resumo.faltaCentavos > 0}
              className={BOTAO_ESCURO}
            >
              {enviando ? (
                <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              ) : null}
              (F3) Concluir venda
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['Total', resumo.totalCentavos, 'text-ink'],
              [
                'Falta',
                resumo.faltaCentavos,
                resumo.faltaCentavos ? 'text-[#b3242f]' : 'text-stone',
              ],
              [
                'Troco',
                resumo.trocoCentavos,
                resumo.trocoCentavos ? 'text-[#00664d]' : 'text-stone',
              ],
            ] as const
          ).map(([rotulo, centavos, cor]) => (
            <div key={rotulo} className="bg-surface-soft rounded-2xl px-4 py-3">
              <p className="text-caption text-stone">{rotulo}</p>
              <p className={`font-display text-heading-sm tabular-nums ${cor}`}>
                {formatarMoeda(centavos)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Forma de pagamento">
          {formas === null ? (
            <span className="text-body-sm text-stone flex items-center gap-2">
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Formas…
            </span>
          ) : null}
          {formas?.map((item, indice) => (
            <button
              key={item.codigo}
              type="button"
              role="radio"
              aria-checked={forma?.codigo === item.codigo}
              onClick={() => escolherForma(item)}
              className={`text-caption inline-flex h-9 items-center gap-2 rounded-xl px-3 font-medium transition ${
                forma?.codigo === item.codigo
                  ? 'bg-canvas-dark text-white'
                  : 'bg-surface-soft text-ink hover:bg-[#ececee]'
              }`}
            >
              {indice < 9 ? (
                <kbd className="rounded bg-white/20 px-1 font-mono text-[11px]">
                  Alt+{indice + 1}
                </kbd>
              ) : null}
              {item.codigo} - {item.nome}
            </button>
          ))}
        </div>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            adicionar();
          }}
          className="flex gap-2"
        >
          <input
            ref={campo}
            inputMode="decimal"
            value={valor}
            onChange={(evento) => setValor(evento.target.value.replace(/[^\d,]/g, ''))}
            aria-label="Valor do pagamento"
            className={`${INPUT_DE_BUSCA} h-12 flex-1 text-right text-lg tabular-nums`}
          />
          <button type="submit" disabled={!forma} className={`${BOTAO_ESCURO} h-12`}>
            (Enter) Lançar
          </button>
        </form>

        {pagamentos.length ? (
          <ul className="border-hairline-light divide-hairline-light divide-y rounded-2xl border">
            {pagamentos.map((pagamento, indice) => (
              <li
                key={`${pagamento.forma.codigo}-${indice}`}
                className="text-body-sm flex items-center gap-3 px-4 py-2"
              >
                <span className="text-ink flex-1">
                  {pagamento.forma.codigo} - {pagamento.forma.nome}
                </span>
                <span className="tabular-nums">{formatarMoeda(pagamento.valorCentavos)}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPagamentos(pagamentos.filter((_, posicao) => posicao !== indice))
                  }
                  aria-label="Tirar pagamento"
                  className="text-stone rounded-full p-1 hover:text-[#b3242f]"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
