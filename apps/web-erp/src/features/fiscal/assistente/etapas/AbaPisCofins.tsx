import { DocInput, Field, Input, Select, Text } from '@synapse/sdl';
import type { PisCofinsDefault } from '@synapse/types';
import { useState } from 'react';
import { LinhaDeCampos, Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { CST_ENTRADA, CST_SAIDA } from '../assistente.dados';
import { formatarDecimal, lerDecimal, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { Escolha } from '../campos';

/** Guarda o texto enquanto a pessoa digita ("1," ainda não é número) e só
 *  formata com 4 casas quando o campo perde o foco — mesmo parse de antes. */
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
    <Field label={rotulo} className={L.curto}>
      <div className="flex items-center gap-2">
        <Input
          align="right"
          inputMode="decimal"
          value={texto ?? formatarDecimal(valor)}
          onFocus={() => setTexto(formatarDecimal(valor))}
          onBlur={() => setTexto(null)}
          onChange={(e) => {
            const limpo = e.target.value.replace(/[^\d,]/g, '');
            setTexto(limpo);
            aoMudar(lerDecimal(limpo));
          }}
        />
        <Text variant="corpoSecundario" aria-hidden="true">
          %
        </Text>
      </div>
    </Field>
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
    <Secao
      titulo="PIS / COFINS padrão"
      descricao="Tributação sugerida para produtos sem PIS/COFINS próprio no cadastro."
    >
      <div className="space-y-4">
        <Escolha
          rotulo="Nota fiscal de"
          valor={sentido}
          opcoes={[
            { valor: 'outbound', rotulo: 'Saída' },
            { valor: 'inbound', rotulo: 'Entrada' },
          ]}
          aoMudar={setSentido}
        />
        <Field label="Código da situação tributária (CST)" className="max-w-3xl">
          <Select key={sentido} value={padrao.cst} onChange={(e) => mudar({ cst: e.target.value })}>
            {tabela.map(([codigo, descricao]) => (
              <option key={codigo} value={codigo}>
                {`${codigo} - ${descricao}`}
              </option>
            ))}
          </Select>
        </Field>
        <div key={`percentuais-${sentido}`}>
          <LinhaDeCampos>
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
            <Field
              label="Natureza da receita"
              className={L.medio}
              hint="Código de 3 dígitos das tabelas 4.3.x do EFD-Contribuições, quando o CST pede."
            >
              <DocInput
                value={padrao.revenueNature}
                onChange={(e) => mudar({ revenueNature: soDigitos(e.target.value).slice(0, 3) })}
              />
            </Field>
          </LinhaDeCampos>
        </div>
      </div>
    </Secao>
  );
}
