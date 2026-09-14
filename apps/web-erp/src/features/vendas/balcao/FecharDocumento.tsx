/* eslint-disable max-lines-per-function */
import { Modal } from '@synapse/ui';
import type {
  ClienteNaLista,
  PedidoDeVenda,
  ReferenciaDeTabela,
  TipoDePedido,
} from '@synapse/types';
import { CircleAlert, LoaderCircle, UserRound } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { CampoDeTabela } from '../../cadastros/comum/CampoDeTabela';
import {
  BOTAO_CLARO,
  BOTAO_ESCURO,
  BOTAO_PEQUENO,
  INPUT_DE_BUSCA,
} from '../../cadastros/comum/estilos';
import { ROTULO_DO_TIPO } from '../../credit/analise';
import { formatarDocumento, formatarMoeda, lerMoeda } from '../../customers/formato';
import type { VendedorNaLista } from '../../funcionarios/funcionarios.api';
import type { LinhaDaVenda, TotaisDaVenda } from '../comum/itens';
import { useAtalhosDaTela } from '../comum/useAtalhosDaTela';
import { listarFormasDePagamento, registrarPedidoDeBalcao } from '../comum/vendas.api';

/** (F3) Fechar Documento: cliente, tipo, forma e condição de pagamento, frete,
 *  acréscimo e observação. O pedido vai para a Análise de Crédito com origem
 *  Balcão; preço e limite de desconto são conferidos de novo na API. */

const TIPOS: readonly TipoDePedido[] = ['VENDA', 'BONIFICACAO', 'TROCA', 'AMOSTRA', 'CONSIGNACAO'];

const ROTULO = 'text-caption text-charcoal mb-1 block font-medium';

export function FecharDocumento({
  filialId,
  cliente,
  vendedor,
  linhas,
  totais,
  aoTrocarCliente,
  aoConcluir,
  aoFechar,
  atalhosAtivos,
}: {
  readonly filialId: string;
  readonly cliente: ClienteNaLista | null;
  readonly vendedor: VendedorNaLista | null;
  readonly linhas: readonly LinhaDaVenda[];
  readonly totais: TotaisDaVenda;
  readonly aoTrocarCliente: () => void;
  readonly aoConcluir: (pedido: PedidoDeVenda) => void;
  readonly aoFechar: () => void;
  readonly atalhosAtivos: boolean;
}) {
  const ids = {
    tipo: useId(),
    condicao: useId(),
    frete: useId(),
    acrescimo: useId(),
    obs: useId(),
  };
  const [tipo, setTipo] = useState<TipoDePedido>('VENDA');
  const [forma, setForma] = useState<ReferenciaDeTabela>({ codigo: 1, nome: 'DINHEIRO' });
  const [condicao, setCondicao] = useState('');
  const [frete, setFrete] = useState('');
  const [acrescimo, setAcrescimo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarFormasDePagamento()
      .then((formas) => {
        const primeira = formas[0];
        setForma((atual) =>
          formas.some((item) => item.codigo === atual.codigo) || !primeira
            ? atual
            : { codigo: primeira.codigo, nome: primeira.nome },
        );
      })
      .catch(() => undefined);
  }, []);

  const freteCentavos = lerMoeda(frete);
  const acrescimoCentavos = lerMoeda(acrescimo);
  const total = totais.liquidoCentavos + freteCentavos + acrescimoCentavos;

  const confirmar = async () => {
    if (enviando) return;
    if (!cliente) {
      setErro('Informe o cliente (F11)');
      return;
    }
    if (!vendedor) {
      setErro('Escolha o vendedor na tela antes de fechar');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const pedido = await registrarPedidoDeBalcao({
        branchId: filialId,
        customerId: cliente.id,
        funcionarioId: vendedor.id,
        tipo,
        formaDePagamentoCodigo: forma.codigo,
        condicaoDePagamento: condicao,
        freteCentavos,
        acrescimoCentavos,
        observacao: observacao.trim() || null,
        itens: linhas.map((linha) => ({
          productId: linha.productId,
          quantidade: linha.quantidade,
          precoNegociadoCentavos: null,
          descontoCentavos: linha.descontoCentavos,
          lote: linha.lote,
        })),
      });
      aoConcluir(pedido);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível fechar o documento');
    } finally {
      setEnviando(false);
    }
  };

  useAtalhosDaTela({ F2: () => void confirmar(), F11: aoTrocarCliente }, atalhosAtivos);

  return (
    <Modal
      onClose={aoFechar}
      title="Fechar Documento"
      description={`${totais.itens} ${totais.itens === 1 ? 'item' : 'itens'} · ${vendedor ? `${vendedor.codigo} - ${vendedor.nome}` : 'sem vendedor'}`}
      size="xl"
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
              <span className="text-stone">O pedido entra na Análise de Crédito.</span>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={aoFechar} className={BOTAO_CLARO}>
              (Esc) Voltar
            </button>
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={enviando}
              className={BOTAO_ESCURO}
            >
              {enviando ? (
                <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
              ) : null}
              (F2) Confirmar pedido
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-4">
          <section className="border-hairline-light flex items-center gap-3 rounded-2xl border p-3">
            <span className="bg-surface-soft text-charcoal flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <UserRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              {cliente ? (
                <>
                  <p className="text-body-sm text-ink truncate font-semibold">
                    {cliente.codigo ? `${cliente.codigo} - ` : ''}
                    {cliente.nome}
                  </p>
                  <p className="text-caption text-stone truncate">
                    {[
                      formatarDocumento(cliente.documento),
                      cliente.cidade && `${cliente.cidade}/${cliente.uf}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </>
              ) : (
                <p className="text-body-sm text-[#b3242f]">Nenhum cliente informado.</p>
              )}
            </div>
            <button type="button" onClick={aoTrocarCliente} className={BOTAO_PEQUENO}>
              (F11) {cliente ? 'Trocar' : 'Informar'}
            </button>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label htmlFor={ids.tipo} className={ROTULO}>
                Tipo do pedido
              </label>
              <select
                id={ids.tipo}
                value={tipo}
                onChange={(evento) => setTipo(evento.target.value as TipoDePedido)}
                className={INPUT_DE_BUSCA}
              >
                {TIPOS.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {ROTULO_DO_TIPO[opcao]}
                  </option>
                ))}
              </select>
            </div>
            <CampoDeTabela
              tipo="formas-de-pagamento"
              rotulo="Forma de pagamento"
              valor={forma}
              aoMudar={setForma}
            />
            <div className="col-span-2">
              <label htmlFor={ids.condicao} className={ROTULO}>
                Condição de pagamento
              </label>
              <input
                id={ids.condicao}
                value={condicao}
                onChange={(evento) => setCondicao(evento.target.value)}
                placeholder="À vista, 30, 28/35/42"
                className={INPUT_DE_BUSCA}
              />
            </div>
            <div>
              <label htmlFor={ids.frete} className={ROTULO}>
                Frete (R$)
              </label>
              <input
                id={ids.frete}
                inputMode="decimal"
                value={frete}
                onChange={(evento) => setFrete(evento.target.value.replace(/[^\d,]/g, ''))}
                placeholder="0,00"
                className={`${INPUT_DE_BUSCA} text-right tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor={ids.acrescimo} className={ROTULO}>
                Acréscimo (R$)
              </label>
              <input
                id={ids.acrescimo}
                inputMode="decimal"
                value={acrescimo}
                onChange={(evento) => setAcrescimo(evento.target.value.replace(/[^\d,]/g, ''))}
                placeholder="0,00"
                className={`${INPUT_DE_BUSCA} text-right tabular-nums`}
              />
            </div>
            <div className="col-span-full">
              <label htmlFor={ids.obs} className={ROTULO}>
                Observação
              </label>
              <textarea
                id={ids.obs}
                value={observacao}
                maxLength={500}
                rows={3}
                onChange={(evento) => setObservacao(evento.target.value)}
                className="border-hairline-light text-body-sm text-ink focus:border-primary focus:ring-primary/15 w-full rounded-xl border bg-white px-3.5 py-2 outline-none focus:ring-4"
              />
            </div>
          </div>
        </div>

        <dl className="bg-surface-soft text-body-sm flex h-fit flex-col gap-1.5 rounded-2xl p-4">
          {(
            [
              ['Total bruto', totais.brutoCentavos],
              ['Descontos', -totais.descontosCentavos],
              ['Frete (+)', freteCentavos],
              ['Acréscimos (+)', acrescimoCentavos],
            ] as const
          ).map(([rotulo, valor]) => (
            <div key={rotulo} className="flex justify-between gap-3">
              <dt className="text-stone">{rotulo}</dt>
              <dd className={`tabular-nums ${valor < 0 ? 'text-[#b3242f]' : 'text-ink'}`}>
                {formatarMoeda(valor)}
              </dd>
            </div>
          ))}
          <div className="text-stone flex justify-between gap-3">
            <dt>Peso total</dt>
            <dd className="tabular-nums">
              {totais.pesoKg.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg
            </dd>
          </div>
          <div className="border-hairline-light mt-2 flex items-baseline justify-between gap-3 border-t pt-3">
            <dt className="text-ink font-semibold">Total líquido</dt>
            <dd className="font-display text-heading-sm text-ink tabular-nums">
              {formatarMoeda(total)}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
