import { DocInput, Field, Input, Select } from '@synapse/sdl';
import type { NfeSettings } from '@synapse/types';
import { AreaDeTexto, LinhaDeCampos, Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { formatarCfop, lerInteiro, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { Escolha, Nota } from '../campos';
import { PainelComAbas } from './PainelComAbas';

type Mudar = (parcial: Partial<NfeSettings>) => void;
type Erro = PropsDeEtapa['erroDoCampo'];

function Configuracoes({
  nfe,
  mudar,
  erroDoCampo,
}: {
  readonly nfe: NfeSettings;
  readonly mudar: Mudar;
  readonly erroDoCampo: Erro;
}) {
  return (
    <Secao titulo="Configurações">
      <LinhaDeCampos>
        <Field
          label="CFOP dentro do estado"
          className={L.curto}
          data-campo="nfe.cfopInState"
          error={erroDoCampo('nfe.cfopInState')}
        >
          <DocInput
            value={formatarCfop(nfe.cfopInState)}
            onChange={(e) => mudar({ cfopInState: soDigitos(e.target.value).slice(0, 4) })}
          />
        </Field>
        <Field
          label="CFOP fora do estado"
          className={L.curto}
          data-campo="nfe.cfopOutOfState"
          error={erroDoCampo('nfe.cfopOutOfState')}
        >
          <DocInput
            value={formatarCfop(nfe.cfopOutOfState)}
            onChange={(e) => mudar({ cfopOutOfState: soDigitos(e.target.value).slice(0, 4) })}
          />
        </Field>
        <Field
          label="Natureza da operação padrão"
          className={L.resto}
          data-campo="nfe.operationNature"
          error={erroDoCampo('nfe.operationNature')}
        >
          <Input
            value={nfe.operationNature}
            maxLength={60}
            onChange={(e) => mudar({ operationNature: e.target.value.toUpperCase() })}
          />
        </Field>
      </LinhaDeCampos>
    </Secao>
  );
}

function Series({ props, mudar }: { readonly props: PropsDeEtapa; readonly mudar: Mudar }) {
  const { formulario, alterar, erroDoCampo } = props;
  return (
    <Secao titulo="Controle de série">
      <LinhaDeCampos>
        <Field
          label="Série"
          className={L.codigo}
          data-campo="nfeSeries"
          error={erroDoCampo('nfeSeries')}
        >
          {/* Mesmo parse (lerInteiro + teto) e mesmo type text; só alinha à direita. */}
          <Input
            align="right"
            inputMode="numeric"
            value={String(formulario.nfeSeries)}
            onChange={(e) =>
              alterar((atual) => ({
                ...atual,
                nfeSeries: Math.min(lerInteiro(e.target.value), 999),
              }))
            }
          />
        </Field>
        <Field
          label="Próximo número"
          className={L.curto}
          data-campo="nfe.nextNumber"
          error={erroDoCampo('nfe.nextNumber')}
        >
          <Input
            align="right"
            inputMode="numeric"
            value={String(formulario.nfe.nextNumber)}
            onChange={(e) =>
              mudar({ nextNumber: Math.min(lerInteiro(e.target.value), 999_999_999) })
            }
          />
        </Field>
      </LinhaDeCampos>
      <div className="mt-5">
        <Nota>
          A primeira NF-e que o Synapse emitir nesta série usa o próximo número informado — útil
          para continuar a numeração de outro sistema. Depois disso a sequência avança sozinha.
        </Nota>
      </div>
    </Secao>
  );
}

function Danfe({ nfe, mudar }: { readonly nfe: NfeSettings; readonly mudar: Mudar }) {
  return (
    <Secao titulo="DANFE NF-e">
      <div className="space-y-4">
        <Escolha
          rotulo="Orientação"
          valor={nfe.danfeOrientation}
          opcoes={[
            { valor: 'PORTRAIT', rotulo: 'Retrato' },
            { valor: 'LANDSCAPE', rotulo: 'Paisagem' },
          ]}
          aoMudar={(danfeOrientation) => mudar({ danfeOrientation })}
        />
        <Field label="Informações complementares padrão" className="max-w-4xl">
          <AreaDeTexto
            rows={4}
            value={nfe.additionalInfo}
            maxLength={2000}
            onChange={(e) => mudar({ additionalInfo: e.target.value })}
          />
        </Field>
      </div>
    </Secao>
  );
}

function FormaDeEmissao({ nfe, mudar }: { readonly nfe: NfeSettings; readonly mudar: Mudar }) {
  return (
    <Secao titulo="Forma de emissão">
      <div className="space-y-4">
        <Field label="Forma de emissão" className={L.longo}>
          <Select
            value={nfe.emissionMode}
            onChange={(e) =>
              mudar({ emissionMode: e.target.value === 'CONTINGENCY' ? 'CONTINGENCY' : 'NORMAL' })
            }
          >
            <option value="NORMAL">Emissão normal</option>
            <option value="CONTINGENCY">Contingência SVC (SEFAZ Virtual)</option>
          </Select>
        </Field>
        {nfe.emissionMode === 'CONTINGENCY' && (
          <Nota>Use a contingência SVC só enquanto a SEFAZ autorizadora estiver fora do ar.</Nota>
        )}
      </div>
    </Secao>
  );
}

export function EtapaNfe(props: PropsDeEtapa) {
  const { formulario, alterar, aba } = props;
  const { nfe } = formulario;
  const mudar: Mudar = (parcial) =>
    alterar((atual) => ({ ...atual, nfe: { ...atual.nfe, ...parcial } }));

  return (
    <PainelComAbas
      etapa="nfe"
      aba={aba}
      aoMudarAba={props.aoMudarAba}
      pendencias={props.pendencias}
    >
      {aba === 'configuracoes' && (
        <Configuracoes nfe={nfe} mudar={mudar} erroDoCampo={props.erroDoCampo} />
      )}
      {aba === 'series' && <Series props={props} mudar={mudar} />}
      {aba === 'danfe' && <Danfe nfe={nfe} mudar={mudar} />}
      {aba === 'forma-emissao' && <FormaDeEmissao nfe={nfe} mudar={mudar} />}
    </PainelComAbas>
  );
}
