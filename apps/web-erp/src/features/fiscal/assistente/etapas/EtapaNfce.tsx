import { DocInput, Field, Input, Select } from '@synapse/sdl';
import type { NfceDanfeSettings, NfceSettings } from '@synapse/types';
import { AreaDeTexto, LinhaDeCampos, Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { formatarCfop, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { CampoSegredo, Marcador, Nota } from '../campos';
import { AbaNfceCartao } from './AbaNfceCartao';
import { AbaNfceSeries } from './AbaNfceSeries';
import { PainelComAbas } from './PainelComAbas';

type Mudar = (parcial: Partial<NfceSettings>) => void;

function Configuracoes({ props, mudar }: { readonly props: PropsDeEtapa; readonly mudar: Mudar }) {
  const { formulario, alterar, segredos, gravados, alterarSegredo, erroDoCampo } = props;
  return (
    <Secao titulo="Configurações">
      <LinhaDeCampos>
        <Field
          label="CFOP dentro do estado"
          className={L.curto}
          data-campo="nfce.cfopInState"
          error={erroDoCampo('nfce.cfopInState')}
        >
          <DocInput
            value={formatarCfop(formulario.nfce.cfopInState)}
            onChange={(e) => mudar({ cfopInState: soDigitos(e.target.value).slice(0, 4) })}
          />
        </Field>
        <Field label="Identificador do CSC" className={L.curto}>
          <Input
            className="font-data"
            value={formulario.cscId}
            maxLength={20}
            placeholder="000001"
            onChange={(e) => alterar((atual) => ({ ...atual, cscId: e.target.value.trim() }))}
          />
        </Field>
        <CampoSegredo
          rotulo="CSC"
          className={L.resto}
          gravado={gravados.csc}
          valor={segredos.csc}
          aoMudar={(valor) => alterarSegredo('csc', valor.trim())}
        />
      </LinhaDeCampos>
      <div className="mt-3">
        <Marcador
          rotulo="Abrir tela de emissão"
          descricao="Mostra a NFC-e antes de transmitir, para conferir."
          marcado={formulario.nfce.openEmissionScreen}
          aoMudar={(openEmissionScreen) => mudar({ openEmissionScreen })}
        />
      </div>
    </Secao>
  );
}

function Danfe({
  danfe,
  mudar,
}: {
  readonly danfe: NfceDanfeSettings;
  readonly mudar: (parcial: Partial<NfceDanfeSettings>) => void;
}) {
  return (
    <Secao titulo="DANFE NFC-e">
      <div className="space-y-5">
        <LinhaDeCampos>
          <Field label="Estilo padrão do DANFE" className={L.medio}>
            <Select
              value={danfe.style}
              onChange={(e) => mudar({ style: e.target.value === 'A4' ? 'A4' : 'MINI_PRINTER' })}
            >
              <option value="MINI_PRINTER">Mini impressora</option>
              <option value="A4">Folha A4</option>
            </Select>
          </Field>
          <Field label="Tipo de impressão A4" className={L.medio} disabled={danfe.style !== 'A4'}>
            <Select
              value={danfe.a4Layout}
              onChange={(e) =>
                mudar({ a4Layout: e.target.value === 'COMPACT' ? 'COMPACT' : 'STANDARD' })
              }
            >
              <option value="STANDARD">Padrão</option>
              <option value="COMPACT">Compacto</option>
            </Select>
          </Field>
        </LinhaDeCampos>
        <OpcoesDeImpressao danfe={danfe} mudar={mudar} />
        <Field label="Informações complementares" className="max-w-4xl">
          <AreaDeTexto
            rows={4}
            value={danfe.additionalInfo}
            maxLength={2000}
            onChange={(e) => mudar({ additionalInfo: e.target.value })}
          />
        </Field>
      </div>
    </Secao>
  );
}

/** As caixas do DANFE NFC-e. As duas de detalhe só valem com o DANFE
 *  detalhado — mesma regra de desabilitar de antes. */
function OpcoesDeImpressao({
  danfe,
  mudar,
}: {
  readonly danfe: NfceDanfeSettings;
  readonly mudar: (parcial: Partial<NfceDanfeSettings>) => void;
}) {
  const caixa = (
    chave: keyof NfceDanfeSettings & `${string}`,
    rotulo: string,
    desabilitada = false,
  ) => (
    <Marcador
      rotulo={rotulo}
      marcado={Boolean(danfe[chave])}
      disabled={desabilitada}
      aoMudar={(marcado) => mudar({ [chave]: marcado })}
    />
  );
  return (
    <div className="grid gap-x-10 lg:grid-cols-2">
      <div>
        {caixa('detailed', 'Imprimir descrição estendida (DANFE detalhado)')}
        <div className="ml-6">
          {caixa(
            'productAdditionalInfo',
            'Exibir a informação adicional do produto',
            !danfe.detailed,
          )}
          {caixa(
            'approximateTaxes',
            'Exibir o valor aproximado dos tributos do item',
            !danfe.detailed,
          )}
        </div>
      </div>
      <div>
        {caixa(
          'unidentifiedConsumerName',
          'Mostrar o nome do consumidor não identificado na observação',
        )}
        {caixa('cutPaper', 'Acionar guilhotina após a emissão')}
        {caixa('orderPassword', 'Imprimir senha do pedido na observação')}
        {caixa('registerNumber', 'Imprimir número do caixa na observação')}
      </div>
    </div>
  );
}

function FormaDeEmissao({ props, mudar }: { readonly props: PropsDeEtapa; readonly mudar: Mudar }) {
  const { formulario, alterar, segredos, gravados, alterarSegredo, erroDoCampo } = props;
  const { nfce } = formulario;
  return (
    <>
      <Secao titulo="Forma de emissão">
        <div className="space-y-3">
          <Field label="Forma de emissão" className={L.longo}>
            <Select
              value={nfce.emissionMode}
              onChange={(e) =>
                mudar({
                  emissionMode: e.target.value === 'CONTINGENCY' ? 'CONTINGENCY' : 'NORMAL',
                })
              }
            >
              <option value="NORMAL">Emissão normal</option>
              <option value="CONTINGENCY">Contingência offline</option>
            </Select>
          </Field>
          <Marcador
            rotulo="Entrar em contingência offline sozinho quando a SEFAZ não responder"
            marcado={formulario.nfceContingencyEnabled}
            aoMudar={(nfceContingencyEnabled) =>
              alterar((atual) => ({ ...atual, nfceContingencyEnabled }))
            }
          />
        </div>
      </Secao>
      <Secao titulo="Transmissão da contingência offline">
        <div className="space-y-3">
          <Marcador
            rotulo="Exigir senha para transmitir NFC-e em contingência offline"
            marcado={nfce.requireOfflinePassword}
            aoMudar={(requireOfflinePassword) => mudar({ requireOfflinePassword })}
          />
          {nfce.requireOfflinePassword && (
            <CampoSegredo
              rotulo="Senha da contingência"
              className={L.medio}
              campo="segredo.nfceOfflinePassword"
              erro={erroDoCampo('segredo.nfceOfflinePassword')}
              gravado={gravados.senhaOffline}
              valor={segredos.nfceOfflinePassword}
              aoMudar={(valor) => alterarSegredo('nfceOfflinePassword', valor)}
            />
          )}
          <Nota>Notas em contingência offline precisam ser transmitidas em até 24 horas.</Nota>
        </div>
      </Secao>
    </>
  );
}

export function EtapaNfce(props: PropsDeEtapa) {
  const { formulario, alterar, aba } = props;
  const mudar: Mudar = (parcial) =>
    alterar((atual) => ({ ...atual, nfce: { ...atual.nfce, ...parcial } }));
  const mudarDanfe = (parcial: Partial<NfceDanfeSettings>) =>
    alterar((atual) => ({
      ...atual,
      nfce: { ...atual.nfce, danfe: { ...atual.nfce.danfe, ...parcial } },
    }));

  return (
    <PainelComAbas
      etapa="nfce"
      aba={aba}
      aoMudarAba={props.aoMudarAba}
      pendencias={props.pendencias}
    >
      {aba === 'configuracoes' && <Configuracoes props={props} mudar={mudar} />}
      {aba === 'series' && <AbaNfceSeries nfce={formulario.nfce} mudar={mudar} />}
      {aba === 'danfe' && <Danfe danfe={formulario.nfce.danfe} mudar={mudarDanfe} />}
      {aba === 'forma-emissao' && <FormaDeEmissao props={props} mudar={mudar} />}
      {aba === 'cartao' && <AbaNfceCartao nfce={formulario.nfce} mudar={mudar} />}
    </PainelComAbas>
  );
}
