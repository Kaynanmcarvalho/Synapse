import type { ReactNode } from 'react';
import { Abas } from '../../../../components/formulario/Formulario';
import { ETAPAS } from '../assistente.dados';
import type { EtapaId, Pendencia } from '../assistente.tipos';

/** Abas de uma etapa do assistente: as abas do Form Grammar (setas ←/→,
 *  `aria-controls`) — os mesmos ids de antes (`{etapa}-aba-{aba}` e
 *  `{etapa}-painel`). A aba com pendência que impede salvar ganha o ponto de
 *  erro da própria aba; a mensagem fica na faixa da etapa e no campo. */
export function PainelComAbas({
  etapa,
  aba,
  aoMudarAba,
  pendencias,
  children,
}: {
  readonly etapa: EtapaId;
  readonly aba: string;
  readonly aoMudarAba: (aba: string) => void;
  readonly pendencias: readonly Pendencia[];
  readonly children: ReactNode;
}) {
  const abas = ETAPAS.find((item) => item.id === etapa)?.abas ?? [];
  const comErro = pendencias
    .filter((p) => p.etapa === etapa && p.bloqueia && p.aba)
    .map((p) => p.aba as string);
  return (
    <>
      <Abas
        idBase={etapa}
        rotulo="Abas da etapa"
        abas={abas}
        ativa={aba}
        aoMudar={aoMudarAba}
        comErro={comErro}
      />
      <div
        role="tabpanel"
        id={`${etapa}-painel`}
        aria-labelledby={`${etapa}-aba-${aba}`}
        className="space-y-8 pt-6"
      >
        {children}
      </div>
    </>
  );
}
