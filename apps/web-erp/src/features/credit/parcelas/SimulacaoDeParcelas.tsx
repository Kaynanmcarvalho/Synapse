import type { CarteiraDoCliente } from '@synapse/types';
import {
  calendarioDoPedido,
  descricaoDoParcelamento,
  vencimentosDoPedido,
  type CalendarioDasParcelas,
  type PedidoDoCalendario,
  type TituloGravado,
} from '@synapse/validation';
import { Search, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Celula, LinhaDaTabela, Tabela, type ColunaDaTabela } from '../Tabela';
import { formatarData, formatarMoeda, hojeLocal } from '../analise';
import { useEscParaFechar } from '../ui/useEscParaFechar';
import { diferencaParaMedia, referenciasDoCliente } from './referencias';

const COLUNAS: readonly ColunaDaTabela[] = [
  { rotulo: 'Parcela', alinhamento: 'centro', largura: '72px' },
  { rotulo: 'Vencimento', alinhamento: 'centro' },
  { rotulo: 'Dias', alinhamento: 'direita', largura: '60px' },
  { rotulo: 'Valor', alinhamento: 'direita' },
  { rotulo: 'x Média paga', alinhamento: 'direita' },
];

const coluna = (indice: number): ColunaDaTabela => COLUNAS[indice] ?? { rotulo: '' };

const DIA_DA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });

/** Boleto que vence no fim de semana so e pago no dia util seguinte. */
const diaDaSemana = (iso: string) => {
  const data = new Date(`${iso}T12:00:00.000Z`);
  return {
    nome: DIA_DA_SEMANA.format(data).replace('.', ''),
    fimDeSemana: [0, 6].includes(data.getUTCDay()),
  };
};

function Comparacao({ diferenca }: { readonly diferenca: number | null }) {
  if (diferenca === null) return <span className="text-stone">—</span>;
  const texto = diferenca > 0 ? `+${diferenca}%` : `${diferenca}%`;
  return <span className={diferenca > 35 ? 'font-semibold text-[#b3242f]' : ''}>{texto}</span>;
}

function Resumo({ calendario }: { readonly calendario: CalendarioDasParcelas }) {
  return (
    <dl className="grid grid-cols-3 gap-3">
      <div>
        <dt className="text-caption text-stone">Total financiado</dt>
        <dd className="text-body-md text-ink font-semibold tabular-nums">
          {formatarMoeda(calendario.financiadoCentavos)}
        </dd>
      </div>
      <div>
        <dt className="text-caption text-stone">Parcelas</dt>
        <dd className="text-body-md text-ink font-semibold">{calendario.parcelas.length}</dd>
      </div>
      <div>
        <dt className="text-caption text-stone">Entrada</dt>
        <dd className="text-body-md text-ink font-semibold tabular-nums">
          {calendario.entradaCentavos > 0 ? formatarMoeda(calendario.entradaCentavos) : '—'}
        </dd>
      </div>
    </dl>
  );
}

function TabelaDasParcelas({
  calendario,
  mediaPaga,
}: {
  readonly calendario: CalendarioDasParcelas;
  readonly mediaPaga: number | null;
}) {
  return (
    <Tabela colunas={mediaPaga === null ? COLUNAS.slice(0, 4) : COLUNAS} larguraMinima={440}>
      {calendario.parcelas.map((parcela) => {
        const dia = diaDaSemana(parcela.vencimento);
        return (
          <LinhaDaTabela key={`${parcela.numero}-${parcela.vencimento}`}>
            <Celula coluna={coluna(0)} forte>
              {parcela.numero}/{parcela.total}
            </Celula>
            <Celula coluna={coluna(1)}>
              {formatarData(parcela.vencimento)}{' '}
              {dia.fimDeSemana ? (
                <span
                  className="inline-flex items-center gap-0.5 font-semibold text-[#8a4b00]"
                  title="Vence no fim de semana: o pagamento cai no próximo dia útil"
                >
                  {dia.nome}
                  <TriangleAlert size={12} aria-hidden="true" />
                  <span className="sr-only">(fim de semana)</span>
                </span>
              ) : (
                <span className="text-stone">{dia.nome}</span>
              )}
            </Celula>
            <Celula coluna={coluna(2)}>{parcela.dias ?? '—'}</Celula>
            <Celula coluna={coluna(3)} forte>
              {formatarMoeda(parcela.valorCentavos)}
            </Celula>
            {mediaPaga !== null && (
              <Celula coluna={coluna(4)}>
                <Comparacao diferenca={diferencaParaMedia(parcela.valorCentavos, mediaPaga)} />
              </Celula>
            )}
          </LinhaDaTabela>
        );
      })}
    </Tabela>
  );
}

/** Posiciona embaixo do gatilho; se nao couber ate o fim da tela, abre para
 *  cima. Mede a altura real do painel antes de pintar, entao nao pisca. */
const usePosicao = (
  gatilho: RefObject<HTMLElement | null>,
  painel: RefObject<HTMLElement | null>,
  aberto: boolean,
) => {
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!aberto || !gatilho.current) return;
    const caixa = gatilho.current.getBoundingClientRect();
    const largura = Math.min(640, window.innerWidth - 32);
    const altura = painel.current?.offsetHeight ?? 360;
    const cabeAbaixo = caixa.bottom + 8 + altura <= window.innerHeight - 16;
    setPosicao({
      top: cabeAbaixo ? caixa.bottom + 8 : Math.max(16, caixa.top - altura - 8),
      left: Math.max(16, Math.min(caixa.left, window.innerWidth - largura - 16)),
    });
  }, [aberto, gatilho, painel]);
  return posicao;
};

function Conteudo({
  calendario,
  condicao,
  mediaPaga,
}: {
  readonly calendario: CalendarioDasParcelas;
  readonly condicao: string;
  readonly mediaPaga: number | null;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="text-caption text-stone">Condição</p>
        <p className="font-display text-heading-sm text-ink">{condicao}</p>
        <p className="text-caption text-charcoal mt-1">
          {calendario.origem === 'SIMULACAO'
            ? `Simulação calculada em ${formatarData(calendario.dataBase ?? hojeLocal())} — conta os dias a partir de hoje e muda amanhã.`
            : 'Vencimentos gravados nos títulos do faturamento — não mudam mais.'}
        </p>
      </div>
      <Resumo calendario={calendario} />
      {calendario.parcelas.length === 0 ? (
        <p className="text-body-sm text-stone py-3">
          {calendario.origem === 'TITULOS'
            ? 'O pedido foi faturado, mas nenhum título válido foi encontrado.'
            : 'Sem cobrança: esta operação não gera parcelas.'}
        </p>
      ) : (
        <TabelaDasParcelas calendario={calendario} mediaPaga={mediaPaga} />
      )}
    </div>
  );
}

/** Lupa da condicao de pagamento: abre um mini modal so com a simulacao das
 *  parcelas. Nao abre o pedido. */
export function SimulacaoDeParcelas({
  pedido,
  titulos = [],
  carteira,
}: {
  readonly pedido: PedidoDoCalendario;
  readonly titulos?: readonly TituloGravado[];
  readonly carteira?: CarteiraDoCliente | null;
}) {
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const posicao = usePosicao(gatilho, painel, aberto);
  const fechar = useCallback(() => setAberto(false), []);
  useEscParaFechar(fechar, aberto);
  const calendario = calendarioDoPedido(pedido, titulos, hojeLocal());
  const condicao = descricaoDoParcelamento(vencimentosDoPedido(pedido));
  const mediaPaga = carteira ? referenciasDoCliente(carteira).mediaPagaCentavos : null;

  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicar = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (!painel.current?.contains(alvo) && !gatilho.current?.contains(alvo)) setAberto(false);
    };
    document.addEventListener('pointerdown', aoClicar);
    return () => {
      document.removeEventListener('pointerdown', aoClicar);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        aria-label={`Simular as parcelas da condição ${condicao}`}
        title="Simular parcelas"
        className="text-charcoal hover:bg-surface-soft hover:text-ink inline-flex h-7 w-7 items-center justify-center rounded-full transition"
      >
        <Search size={15} aria-hidden="true" />
      </button>
      {aberto &&
        createPortal(
          <div
            ref={painel}
            role="dialog"
            aria-label="Simulação de parcelas"
            style={{ top: posicao.top, left: posicao.left }}
            className="border-hairline-light bg-canvas-light shadow-janela animate-surgir fixed z-[85] max-h-[calc(100vh-32px)] w-[min(640px,calc(100vw-32px))] overflow-y-auto rounded-2xl border p-4 motion-reduce:animate-none"
          >
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar a simulação"
              className="text-charcoal hover:bg-surface-soft absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <Conteudo calendario={calendario} condicao={condicao} mediaPaga={mediaPaga} />
          </div>,
          document.body,
        )}
    </>
  );
}
