import type { PisCofinsDefault } from '@synapse/types';
import { useState } from 'react';
import { CST_ENTRADA, CST_SAIDA } from '../assistente.dados';
import { formatarDecimal, lerDecimal, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { Campo, Escolha, Grupo, Selecao } from '../campos';

/** Guarda o texto enquanto a pessoa digita ("1," ainda nao e numero) e so
 *  formata com 4 casas quando o campo perde o foco. */
function CampoPercentual({
  rotulo,
  valor,
  aoMudar,
}: {
  readonly rotulo: string;
  readonly valor: number;
  readonly aoMudar: (valor: number) => void;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <Campo
      rotulo={rotulo}
      inputMode="decimal"
      value={texto ?? formatarDecimal(valor)}
      onFocus={() => setTexto(formatarDecimal(valor))}
      onBlur={() => setTexto(null)}
      onChange={(e) => {
        const limpo = e.target.value.replace(/[^\d,]/g, '');
        setTexto(limpo);
        aoMudar(lerDecimal(limpo));
      }}
      acessorio={<span className="text-body-sm text-stone pr-3">%</span>}
    />
  );
}

type Sentido = 'outbound' | 'inbound';

export function AbaPisCofins({ formulario, alterar }: PropsDeEtapa) {
  const [sentido, setSentido] = useState<Sentido>('outbound');
  const padrao = formulario.pisCofins[sentido];
  const tabela = sentido === 'outbound' ? CST_SAIDA : CST_ENTRADA;
  const mudar = (parcial: Partial<PisCofinsDefault>) =>
    alterar((atual) => ({
      ...atual,
      pisCofins: { ...atual.pisCofins, [sentido]: { ...atual.pisCofins[sentido], ...parcial } },
    }));

  return (
    <Grupo
      titulo="PIS / COFINS padrão"
      descricao="Tributação sugerida para produtos sem PIS/COFINS próprio no cadastro."
    >
      <div className="max-w-3xl space-y-6">
        <Escolha
          rotulo="Nota fiscal de"
          valor={sentido}
          opcoes={[
            { valor: 'outbound', rotulo: 'Saída' },
            { valor: 'inbound', rotulo: 'Entrada' },
          ]}
          aoMudar={setSentido}
        />
        <Selecao
          key={sentido}
          rotulo="Código da situação tributária (CST)"
          valor={padrao.cst}
          opcoes={tabela.map(([codigo, descricao]) => ({
            valor: codigo,
            rotulo: `${codigo} - ${descricao}`,
          }))}
          aoMudar={(cst) => mudar({ cst })}
        />
        <div className="grid gap-5 sm:grid-cols-3" key={`percentuais-${sentido}`}>
          <CampoPercentual
            rotulo="Redução da BC"
            valor={padrao.baseReductionPercent}
            aoMudar={(baseReductionPercent) => mudar({ baseReductionPercent })}
          />
          <CampoPercentual
            rotulo="Alíquota PIS"
            valor={padrao.pisRate}
            aoMudar={(pisRate) => mudar({ pisRate })}
          />
          <CampoPercentual
            rotulo="Alíquota COFINS"
            valor={padrao.cofinsRate}
            aoMudar={(cofinsRate) => mudar({ cofinsRate })}
          />
        </div>
        <Campo
          rotulo="Natureza da receita"
          className="max-w-[220px]"
          inputMode="numeric"
          value={padrao.revenueNature}
          dica="Código de 3 dígitos das tabelas 4.3.x do EFD-Contribuições, quando o CST pede."
          onChange={(e) => mudar({ revenueNature: soDigitos(e.target.value).slice(0, 3) })}
        />
      </div>
    </Grupo>
  );
}
