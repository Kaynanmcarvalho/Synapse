import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { ArrowUpRight, Ban, ChartColumn, ExternalLink, Gauge } from 'lucide-react';
import { Bloco } from '../campos';
import { formatarMoeda } from '../formato';
import type { PropsDaAba } from './aba';
import type { VisaoDeCredito } from '../useVisaoDeCredito';

/** Aba Relatórios: o que dá para abrir de verdade sobre este cliente.
 *
 *  O Syndata lista sete relatórios aqui. O Synapse tem três deles hoje, e cada
 *  um abre a tela que já existe — botão que não leva a lugar nenhum some da
 *  lista e aparece embaixo, dito com todas as letras. */

interface Atalho {
  readonly titulo: string;
  readonly descricao: string;
  readonly abrir: () => void;
}

function Botao({ atalho }: { readonly atalho: Atalho }) {
  return (
    <button
      type="button"
      onClick={atalho.abrir}
      className="border-hairline-light shadow-cartao hover:shadow-cartao-alto group flex min-h-[6.5rem] w-full flex-col justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
    >
      <span className="text-body-sm text-ink flex items-center justify-between gap-2 font-semibold">
        {atalho.titulo}
        <span className="bg-surface-soft text-charcoal group-hover:bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition group-hover:text-white">
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </span>
      <span className="text-caption text-stone">{atalho.descricao}</span>
    </button>
  );
}

function Numero({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div className="bg-surface-soft/70 rounded-xl px-3.5 py-3">
      <p className="text-caption text-stone">{rotulo}</p>
      <p className="font-display text-body-md text-ink mt-0.5 font-semibold tabular-nums">
        {valor}
      </p>
    </div>
  );
}

function Resumo({ painel }: { readonly painel: PainelDeAnaliseDeCredito }) {
  const { situacao, comportamento } = painel;
  const janela = comportamento.janelas['12M'];
  return (
    <Bloco
      titulo="Situação de crédito hoje"
      icone={Gauge}
      descricao="Calculada agora, com os títulos e pedidos do cliente"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero
          rotulo="Limite"
          valor={
            situacao.limiteCentavos === null ? 'Sem limite' : formatarMoeda(situacao.limiteCentavos)
          }
        />
        <Numero rotulo="Comprometido" valor={formatarMoeda(situacao.comprometidoCentavos)} />
        <Numero
          rotulo="Disponível"
          valor={
            situacao.disponivelCentavos === null
              ? 'Sem limite'
              : formatarMoeda(situacao.disponivelCentavos)
          }
        />
        <Numero rotulo="Títulos vencidos" valor={String(situacao.titulosVencidos)} />
        <Numero rotulo="Compras em 12 meses" valor={String(janela.compras.pedidos)} />
        <Numero
          rotulo="Ticket médio (90 dias)"
          valor={
            painel.comportamento.janelas['90D'].compras.ticketMedioCentavos === null
              ? 'Histórico insuficiente'
              : formatarMoeda(painel.comportamento.janelas['90D'].compras.ticketMedioCentavos ?? 0)
          }
        />
        <Numero
          rotulo="Pagamentos no prazo (12 meses)"
          valor={
            janela.pontualidade.percentualNoPrazo === null
              ? 'Histórico insuficiente'
              : `${janela.pontualidade.percentualNoPrazo}%`
          }
        />
        <Numero rotulo="Pedidos em análise" valor={String(painel.pedidosEmAnalise.length)} />
      </div>
    </Bloco>
  );
}

const NAO_EXISTEM = [
  ['Curva ABC por cliente', 'o Synapse tem curva ABC de produto, não de cliente'],
  ['Agendamentos do cliente', 'não existe agenda de visita ou cobrança'],
  ['Créditos do cliente', 'não existe crédito/adiantamento em nome do cliente'],
  ['Etiqueta do cliente', 'não existe impressão de etiqueta'],
] as const;

/** Os três relatórios que existem abrem a ficha do cliente na análise de crédito. */
const atalhosDe = (clienteId: string, aoAbrirCredito: (id: string) => void): Atalho[] => [
  {
    titulo: 'Análise de crédito do cliente',
    descricao: 'Ficha completa: situação, comportamento, pedidos, notas e títulos.',
    abrir: () => aoAbrirCredito(clienteId),
  },
  {
    titulo: 'Histórico de vendas',
    descricao: 'Pedidos e notas do cliente, na ficha da análise de crédito.',
    abrir: () => aoAbrirCredito(clienteId),
  },
  {
    titulo: 'Contas a receber',
    descricao: 'Títulos em aberto e pagos, na ficha da análise de crédito.',
    abrir: () => aoAbrirCredito(clienteId),
  },
];

export function AbaRelatorios({
  cliente,
  visao,
  aoAbrirCredito,
}: PropsDaAba & {
  readonly visao: VisaoDeCredito;
  readonly aoAbrirCredito: (id: string) => void;
}) {
  if (!cliente) {
    return (
      <Bloco
        titulo="Relatórios"
        icone={ChartColumn}
        descricao="Disponíveis depois de salvar o cadastro"
      >
        <p className="text-body-sm text-stone">
          Os relatórios deste cliente abrem depois de salvar o cadastro.
        </p>
      </Bloco>
    );
  }

  const atalhos = atalhosDe(cliente.id, aoAbrirCredito);

  return (
    <div className="grid gap-4">
      {visao.status === 'pronto' ? <Resumo painel={visao.painel} /> : null}
      {visao.status === 'sem-permissao' ? (
        <Bloco
          titulo="Situação de crédito hoje"
          icone={Gauge}
          descricao="Calculada agora, com os títulos e pedidos do cliente"
        >
          <p className="text-body-sm text-stone">
            Exige permissão do financeiro (financeiro.visualizar).
          </p>
        </Bloco>
      ) : null}

      <Bloco
        titulo="Abrir"
        icone={ExternalLink}
        descricao="Telas do Synapse com os dados deste cliente"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {atalhos.map((atalho) => (
            <Botao key={atalho.titulo} atalho={atalho} />
          ))}
        </div>
      </Bloco>

      <Bloco
        titulo="Ainda não existem no Synapse"
        icone={Ban}
        descricao="Relatórios do Syndata que ainda não têm tela aqui"
      >
        <ul className="grid gap-1.5">
          {NAO_EXISTEM.map(([titulo, motivo]) => (
            <li key={titulo} className="text-body-sm text-stone flex items-start gap-2">
              <Ban size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                <strong className="text-charcoal font-semibold">{titulo}</strong> — {motivo}.
              </span>
            </li>
          ))}
        </ul>
      </Bloco>
    </div>
  );
}
