import type { AvaliacaoDoLote } from '@synapse/validation';
import { BadgeAlert, CheckCheck } from 'lucide-react';
import { formatarMoeda, formatarPercentual } from '../analise';
import { BOTAO_ALERTA, BOTAO_ESCURO } from '../ui/Superficies';

function Total({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <span className="text-caption text-stone whitespace-nowrap">
      {rotulo} <strong className="text-body-sm text-ink font-semibold tabular-nums">{valor}</strong>
    </span>
  );
}

/** Rodape dos pedidos em analise, numa linha so para nao roubar espaco da
 *  tabela: o valor comercial e o impacto em credito da selecao, separados, e o
 *  disponivel que sobra. O botao ja diz se a aprovacao vai ser excepcional — a
 *  mesma regra que a API aplica. */
export function LiberacaoDoLote({
  lote,
  total,
  liberando,
  aoLiberar,
}: {
  readonly lote: AvaliacaoDoLote;
  readonly total: number;
  readonly liberando: boolean;
  readonly aoLiberar: () => void;
}) {
  const quantos = lote.itens.length;
  const excepcionais = lote.excepcionais.length;
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
      <button
        type="button"
        onClick={aoLiberar}
        disabled={quantos === 0 || liberando}
        className={`${excepcionais > 0 ? BOTAO_ALERTA : BOTAO_ESCURO} ml-auto`}
        title={
          excepcionais > 0
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
