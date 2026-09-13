import type { PainelDeAnaliseDeCredito } from '@synapse/types';
import { ArrowUpRight, Ban } from 'lucide-react';
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
      className="border-hairline-light hover:border-hairline-strong flex min-h-[5.5rem] w-full flex-col justify-between rounded-xl border bg-white p-3 text-left transition"
    >
      <span className="text-body-sm text-ink flex items-center gap-1.5 font-semibold">
        {atalho.titulo}
        <ArrowUpRight size={14} aria-hidden="true" className="text-stone" />
      </span>
      <span className="text-caption text-stone">{atalho.descricao}</span>
    </button>
  );
}

function Numero({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div>
      <p className="text-caption text-stone">{rotulo}</p>
      <p className="text-body-sm text-ink font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

function Resumo({ painel }: { readonly painel: PainelDeAnaliseDeCredito }) {
  const { situacao, comportamento } = painel;
  const janela = comportamento.janelas['12M'];
  return (
    <Bloco titulo="Situação de crédito hoje">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
      <Bloco titulo="Relatórios">
        <p className="text-body-sm text-stone">
          Os relatórios deste cliente abrem depois de salvar o cadastro.
        </p>
      </Bloco>
    );
  }

  const atalhos: Atalho[] = [
    {
      titulo: 'Análise de crédito do cliente',
      descricao: 'Ficha completa: situação, comportamento, pedidos, notas e títulos.',
      abrir: () => aoAbrirCredito(cliente.id),
    },
    {
      titulo: 'Histórico de vendas',
      descricao: 'Pedidos e notas do cliente, na ficha da análise de crédito.',
      abrir: () => aoAbrirCredito(cliente.id),
    },
    {
      titulo: 'Contas a receber',
      descricao: 'Títulos em aberto e pagos, na ficha da análise de crédito.',
      abrir: () => aoAbrirCredito(cliente.id),
    },
  ];

  return (
    <div className="grid gap-3">
      {visao.status === 'pronto' ? <Resumo painel={visao.painel} /> : null}
      {visao.status === 'sem-permissao' ? (
        <Bloco titulo="Situação de crédito hoje">
          <p className="text-body-sm text-stone">
            Exige permissão do financeiro (financeiro.visualizar).
          </p>
        </Bloco>
      ) : null}

      <Bloco titulo="Abrir">
        <div className="grid gap-2 sm:grid-cols-3">
          {atalhos.map((atalho) => (
            <Botao key={atalho.titulo} atalho={atalho} />
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Ainda não existem no Synapse">
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
