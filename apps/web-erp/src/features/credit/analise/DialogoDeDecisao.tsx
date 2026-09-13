import type { AcaoDeCredito, AvaliacaoDoPedido, PedidoDeVenda } from '@synapse/types';
import { JUSTIFICATIVA_MINIMA } from '@synapse/validation';
import { BadgeAlert, BadgeCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { CampoDeJustificativa } from '../ui/CampoDeJustificativa';
import { formatarMoeda, formatarPercentual } from '../analise';
import { BOTAO_ALERTA, BOTAO_CLARO, BOTAO_ESCURO, Dialogo } from '../ui/Superficies';

const TEXTO: Record<
  AcaoDeCredito,
  { titulo: (numero: number) => string; confirmar: string; explicacao: string }
> = {
  APROVAR: {
    titulo: (numero) => `Aprovar o pedido ${numero}?`,
    confirmar: 'Aprovar e enviar ao faturamento',
    explicacao:
      'O pedido sai da análise e segue para o faturamento. A aprovação fica no histórico com o seu nome, o horário e os números abaixo.',
  },
  APROVAR_EXCECAO: {
    titulo: (numero) => `Aprovar excepcionalmente o pedido ${numero}?`,
    confirmar: 'Aprovar fora da política',
    explicacao:
      'O pedido fere a política de crédito. Ele só segue com a sua justificativa, que fica gravada para sempre no histórico do pedido.',
  },
  REPROVAR: {
    titulo: (numero) => `Reprovar o pedido ${numero}?`,
    confirmar: 'Reprovar pedido',
    explicacao:
      'O pedido sai da fila e não vai ao faturamento. A justificativa é o que o vendedor vai ler para explicar ao cliente.',
  },
};

const ICONE = { APROVAR: BadgeCheck, APROVAR_EXCECAO: BadgeAlert, REPROVAR: XCircle } as const;

function Resumo({ avaliacao }: { readonly avaliacao: AvaliacaoDoPedido }) {
  const { impacto } = avaliacao;
  const linhas: Array<[string, string]> = [
    ['Valor comercial', formatarMoeda(impacto.valorComercialCentavos)],
    ['Exposição gerada', formatarMoeda(impacto.exposicaoCentavos)],
    [
      'Disponível depois',
      impacto.disponivelDepoisCentavos === null
        ? 'Sem limite'
        : formatarMoeda(impacto.disponivelDepoisCentavos),
    ],
    [
      'Utilização depois',
      impacto.utilizacaoDepoisPercentual === null
        ? '—'
        : formatarPercentual(impacto.utilizacaoDepoisPercentual),
    ],
  ];
  return (
    <dl className="border-hairline-light mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border p-3">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt className="text-caption text-stone">{rotulo}</dt>
          <dd className="text-body-sm text-ink font-semibold tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Violacoes({ avaliacao }: { readonly avaliacao: AvaliacaoDoPedido }) {
  const violados = avaliacao.motivos.filter((motivo) => motivo.violaPolitica);
  if (violados.length === 0) return null;
  return (
    <ul className="mt-3 grid gap-1.5">
      {violados.map((motivo) => (
        <li key={motivo.codigo} className="text-body-sm text-ink rounded-lg bg-[#fdeced] px-3 py-2">
          <strong className="font-semibold text-[#b3242f]">{motivo.rotulo}:</strong>{' '}
          {motivo.detalhe}
        </li>
      ))}
    </ul>
  );
}

function Erro({ texto }: { readonly texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-body-sm mt-3 rounded-lg bg-[#fdeced] px-3 py-2 text-[#b3242f]">
      {texto}
    </p>
  );
}

/** Confirmacao da decisao. Aprovar comum so confirma; excecao e reprovacao
 *  pedem justificativa de verdade, e o botao so libera quando ela existe. */
export function DialogoDeDecisao({
  acao,
  pedido,
  avaliacao,
  enviando,
  erro,
  aoConfirmar,
  aoCancelar,
}: {
  readonly acao: AcaoDeCredito;
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido;
  readonly enviando: boolean;
  readonly erro: string | null;
  readonly aoConfirmar: (justificativa: string) => void;
  readonly aoCancelar: () => void;
}) {
  const [justificativa, setJustificativa] = useState('');
  const texto = TEXTO[acao];
  const Icone = ICONE[acao];
  const exige = acao !== 'APROVAR';
  const valida = justificativa.trim().length >= JUSTIFICATIVA_MINIMA;

  return (
    <Dialogo rotulo={texto.titulo(pedido.numero)} aoFechar={aoCancelar} largura="max-w-lg">
      <span className="bg-surface-soft text-ink flex h-11 w-11 items-center justify-center rounded-full">
        <Icone size={20} aria-hidden="true" />
      </span>
      <h2 className="font-display text-heading-sm text-ink mt-3">{texto.titulo(pedido.numero)}</h2>
      <p className="text-body-sm text-mute mt-1">{texto.explicacao}</p>
      {acao === 'APROVAR_EXCECAO' && <Violacoes avaliacao={avaliacao} />}
      {acao !== 'REPROVAR' && <Resumo avaliacao={avaliacao} />}
      {exige && (
        <CampoDeJustificativa
          rotulo="Justificativa (obrigatória)"
          valor={justificativa}
          aoMudar={setJustificativa}
        />
      )}
      <Erro texto={erro} />
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={aoCancelar} className={BOTAO_CLARO}>
          Cancelar
        </button>
        <button
          type="button"
          data-autofoco={exige ? undefined : true}
          onClick={() => aoConfirmar(justificativa)}
          disabled={enviando || (exige && !valida)}
          className={acao === 'APROVAR' ? BOTAO_ESCURO : BOTAO_ALERTA}
        >
          {enviando ? 'Registrando…' : texto.confirmar}
        </button>
      </div>
    </Dialogo>
  );
}
