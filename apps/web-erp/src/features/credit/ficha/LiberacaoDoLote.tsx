import type { PermissoesDaDecisao } from '@synapse/types';
import type { AvaliacaoDoLote } from '@synapse/validation';
import { BadgeAlert, CheckCheck, Lock } from 'lucide-react';
import { avisosDoLote } from '../analise/capacidade';
import { formatarMoeda, formatarPercentual } from '../analise';
import { BOTAO_ALERTA, BOTAO_ESCURO } from '../ui/Superficies';

function Total({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <span className="text-caption text-stone whitespace-nowrap">
      {rotulo} <strong className="text-body-sm text-ink font-semibold tabular-nums">{valor}</strong>
    </span>
  );
}

const ID_DO_AVISO = 'aviso-de-permissao-do-lote';

/** Rodape dos pedidos em analise, numa linha so para nao roubar espaco da
 *  tabela: o valor comercial e o impacto em credito da selecao, separados, e o
 *  disponivel que sobra. O botao ja diz se a aprovacao vai ser excepcional — a
 *  mesma regra que a API aplica — e, sem a permissao, chega desabilitado com o
 *  motivo escrito. */
export function LiberacaoDoLote({
  lote,
  total,
  liberando,
  permissoes,
  aoLiberar,
}: {
  readonly lote: AvaliacaoDoLote;
  readonly total: number;
  readonly liberando: boolean;
  readonly permissoes: PermissoesDaDecisao;
  readonly aoLiberar: () => void;
}) {
  const quantos = lote.itens.length;
  const excepcionais = lote.excepcionais.length;
  const avisos = avisosDoLote(quantos, excepcionais, permissoes);
  const rotulo =
    excepcionais > 0
      ? `Aprovar excepcionalmente (${quantos})`
      : quantos > 1
        ? `Aprovar ${quantos} pedidos`
        : 'Aprovar pedido';
  const disponivel =
    lote.disponivelDepoisCentavos === null
      ? 'sem limite'
      : `${formatarMoeda(lote.disponivelDepoisCentavos)}${
          lote.utilizacaoDepoisPercentual === null
            ? ''
            : ` (${formatarPercentual(lote.utilizacaoDepoisPercentual)})`
        }`;
  return (
    <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-1.5">
      <Total rotulo="Selecionados" valor={`${quantos} de ${total}`} />
      <Total rotulo="Valor comercial" valor={formatarMoeda(lote.valorComercialCentavos)} />
      <Total rotulo="Impacto em crédito" valor={formatarMoeda(lote.exposicaoCentavos)} />
      <Total rotulo="Disponível após" valor={disponivel} />
      {avisos.length > 0 && (
        <p
          id={ID_DO_AVISO}
          role="note"
          className="text-caption flex basis-full items-start gap-1.5 text-[#8a4b00] sm:order-last"
        >
          <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{avisos.join(' ')}</span>
        </p>
      )}
      <button
        type="button"
        onClick={aoLiberar}
        disabled={quantos === 0 || liberando || avisos.length > 0}
        aria-describedby={avisos.length > 0 ? ID_DO_AVISO : undefined}
        className={`${excepcionais > 0 ? BOTAO_ALERTA : BOTAO_ESCURO} ml-auto`}
        title={
          excepcionais > 0 && avisos.length === 0
            ? `${excepcionais} pedido(s) fora da política: a aprovação exige justificativa`
            : undefined
        }
      >
        {excepcionais > 0 ? (
          <BadgeAlert size={15} aria-hidden="true" />
        ) : (
          <CheckCheck size={15} aria-hidden="true" />
        )}
        {liberando ? 'Aprovando…' : rotulo}
      </button>
    </div>
  );
}
