import type { ReactNode } from 'react';
import { ETAPAS } from '../assistente.dados';
import type { EtapaId } from '../assistente.tipos';
import { Abas } from '../campos';

export function PainelComAbas({
  etapa,
  aba,
  aoMudarAba,
  children,
}: {
  readonly etapa: EtapaId;
  readonly aba: string;
  readonly aoMudarAba: (aba: string) => void;
  readonly children: ReactNode;
}) {
  const abas = ETAPAS.find((item) => item.id === etapa)?.abas ?? [];
  return (
    <>
      <Abas idBase={etapa} abas={abas} ativa={aba} aoMudar={aoMudarAba} />
      <div
        role="tabpanel"
        id={`${etapa}-painel`}
        aria-labelledby={`${etapa}-aba-${aba}`}
        className="pt-8"
      >
        {children}
      </div>
    </>
  );
}
