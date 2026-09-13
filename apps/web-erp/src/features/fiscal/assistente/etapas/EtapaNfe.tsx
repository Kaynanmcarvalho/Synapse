import type { NfeSettings } from '@synapse/types';
import { formatarCfop, lerInteiro, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { AreaDeTexto, Campo, Escolha, Grupo, Nota, Selecao } from '../campos';
import { PainelComAbas } from './PainelComAbas';

type Mudar = (parcial: Partial<NfeSettings>) => void;

function Configuracoes({ nfe, mudar }: { readonly nfe: NfeSettings; readonly mudar: Mudar }) {
  return (
    <Grupo titulo="Configurações">
      <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
        <Campo
          rotulo="CFOP dentro do estado"
          inputMode="numeric"
          value={formatarCfop(nfe.cfopInState)}
          onChange={(e) => mudar({ cfopInState: soDigitos(e.target.value).slice(0, 4) })}
        />
        <Campo
          rotulo="CFOP fora do estado"
          inputMode="numeric"
          value={formatarCfop(nfe.cfopOutOfState)}
          onChange={(e) => mudar({ cfopOutOfState: soDigitos(e.target.value).slice(0, 4) })}
        />
        <Campo
          rotulo="Natureza da operação padrão"
          className="sm:col-span-2"
          value={nfe.operationNature}
          maxLength={60}
          onChange={(e) => mudar({ operationNature: e.target.value.toUpperCase() })}
        />
      </div>
    </Grupo>
  );
}

function Series({ props, mudar }: { readonly props: PropsDeEtapa; readonly mudar: Mudar }) {
  const { formulario, alterar } = props;
  return (
    <Grupo titulo="Controle de série">
      <div className="grid max-w-md gap-5 sm:grid-cols-2">
        <Campo
          rotulo="Série"
          inputMode="numeric"
          value={String(formulario.nfeSeries)}
          onChange={(e) =>
            alterar((atual) => ({ ...atual, nfeSeries: Math.min(lerInteiro(e.target.value), 999) }))
          }
        />
        <Campo
          rotulo="Próximo número"
          inputMode="numeric"
          value={String(formulario.nfe.nextNumber)}
          onChange={(e) => mudar({ nextNumber: Math.min(lerInteiro(e.target.value), 999_999_999) })}
        />
      </div>
      <div className="mt-6 max-w-2xl">
        <Nota>
          A primeira NF-e que o Synapse emitir nesta série usa o próximo número informado — útil
          para continuar a numeração de outro sistema. Depois disso a sequência avança sozinha.
        </Nota>
      </div>
    </Grupo>
  );
}

export function EtapaNfe(props: PropsDeEtapa) {
  const { formulario, alterar, aba } = props;
  const { nfe } = formulario;
  const mudar: Mudar = (parcial) =>
    alterar((atual) => ({ ...atual, nfe: { ...atual.nfe, ...parcial } }));

  return (
    <PainelComAbas etapa="nfe" aba={aba} aoMudarAba={props.aoMudarAba}>
      {aba === 'configuracoes' && <Configuracoes nfe={nfe} mudar={mudar} />}
      {aba === 'series' && <Series props={props} mudar={mudar} />}
      {aba === 'danfe' && (
        <Grupo titulo="DANFE NF-e">
          <div className="max-w-3xl space-y-6">
            <Escolha
              rotulo="Orientação"
              valor={nfe.danfeOrientation}
              opcoes={[
                { valor: 'PORTRAIT', rotulo: 'Retrato' },
                { valor: 'LANDSCAPE', rotulo: 'Paisagem' },
              ]}
              aoMudar={(danfeOrientation) => mudar({ danfeOrientation })}
            />
            <AreaDeTexto
              rotulo="Informações complementares padrão"
              value={nfe.additionalInfo}
              maxLength={2000}
              onChange={(e) => mudar({ additionalInfo: e.target.value })}
            />
          </div>
        </Grupo>
      )}
      {aba === 'forma-emissao' && (
        <Grupo titulo="Forma de emissão">
          <div className="max-w-md space-y-6">
            <Selecao
              rotulo="Forma de emissão"
              valor={nfe.emissionMode}
              opcoes={[
                { valor: 'NORMAL', rotulo: 'Emissão normal' },
                { valor: 'CONTINGENCY', rotulo: 'Contingência SVC (SEFAZ Virtual)' },
              ]}
              aoMudar={(emissionMode) => mudar({ emissionMode })}
            />
            {nfe.emissionMode === 'CONTINGENCY' && (
              <Nota>
                Use a contingência SVC só enquanto a SEFAZ autorizadora estiver fora do ar.
              </Nota>
            )}
          </div>
        </Grupo>
      )}
    </PainelComAbas>
  );
}
