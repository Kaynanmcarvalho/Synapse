import type { NfceDanfeSettings, NfceSettings } from '@synapse/types';
import { formatarCfop, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { AreaDeTexto, Campo, CampoSegredo, Grupo, Marcador, Nota, Selecao } from '../campos';
import { AbaNfceCartao } from './AbaNfceCartao';
import { AbaNfceSeries } from './AbaNfceSeries';
import { PainelComAbas } from './PainelComAbas';

type Mudar = (parcial: Partial<NfceSettings>) => void;

function Configuracoes({ props, mudar }: { readonly props: PropsDeEtapa; readonly mudar: Mudar }) {
  const { formulario, alterar, segredos, gravados, alterarSegredo } = props;
  return (
    <Grupo titulo="Configurações">
      <div className="grid max-w-3xl gap-5 sm:grid-cols-6">
        <Campo
          rotulo="CFOP dentro do estado"
          className="sm:col-span-2"
          inputMode="numeric"
          value={formatarCfop(formulario.nfce.cfopInState)}
          onChange={(e) => mudar({ cfopInState: soDigitos(e.target.value).slice(0, 4) })}
        />
        <Campo
          rotulo="Identificador do CSC"
          className="sm:col-span-2"
          value={formulario.cscId}
          maxLength={20}
          placeholder="000001"
          onChange={(e) => alterar((atual) => ({ ...atual, cscId: e.target.value.trim() }))}
        />
        <CampoSegredo
          rotulo="CSC"
          className="sm:col-span-6"
          gravado={gravados.csc}
          valor={segredos.csc}
          aoMudar={(valor) => alterarSegredo('csc', valor.trim())}
        />
      </div>
      <div className="mt-4 max-w-3xl">
        <Marcador
          rotulo="Abrir tela de emissão"
          descricao="Mostra a NFC-e antes de transmitir, para conferir."
          marcado={formulario.nfce.openEmissionScreen}
          aoMudar={(openEmissionScreen) => mudar({ openEmissionScreen })}
        />
      </div>
    </Grupo>
  );
}

function Danfe({
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
    <Grupo titulo="DANFE NFC-e">
      <div className="max-w-3xl space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Selecao
            rotulo="Estilo padrão do DANFE"
            valor={danfe.style}
            opcoes={[
              { valor: 'MINI_PRINTER', rotulo: 'Mini impressora' },
              { valor: 'A4', rotulo: 'Folha A4' },
            ]}
            aoMudar={(style) => mudar({ style })}
          />
          <Selecao
            rotulo="Tipo de impressão A4"
            valor={danfe.a4Layout}
            disabled={danfe.style !== 'A4'}
            opcoes={[
              { valor: 'STANDARD', rotulo: 'Padrão' },
              { valor: 'COMPACT', rotulo: 'Compacto' },
            ]}
            aoMudar={(a4Layout) => mudar({ a4Layout })}
          />
        </div>
        <div>
          {caixa('detailed', 'Imprimir descrição estendida (DANFE detalhado)')}
          <div className="ml-[30px]">
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
          {caixa(
            'unidentifiedConsumerName',
            'Mostrar o nome do consumidor não identificado na observação',
          )}
          {caixa('cutPaper', 'Acionar guilhotina após a emissão')}
          {caixa('orderPassword', 'Imprimir senha do pedido na observação')}
          {caixa('registerNumber', 'Imprimir número do caixa na observação')}
        </div>
        <AreaDeTexto
          rotulo="Informações complementares"
          value={danfe.additionalInfo}
          maxLength={2000}
          onChange={(e) => mudar({ additionalInfo: e.target.value })}
        />
      </div>
    </Grupo>
  );
}

function FormaDeEmissao({ props, mudar }: { readonly props: PropsDeEtapa; readonly mudar: Mudar }) {
  const { formulario, alterar, segredos, gravados, alterarSegredo } = props;
  const { nfce } = formulario;
  return (
    <>
      <Grupo titulo="Forma de emissão">
        <div className="max-w-3xl space-y-4">
          <Selecao
            rotulo="Forma de emissão"
            className="max-w-md"
            valor={nfce.emissionMode}
            opcoes={[
              { valor: 'NORMAL', rotulo: 'Emissão normal' },
              { valor: 'CONTINGENCY', rotulo: 'Contingência offline' },
            ]}
            aoMudar={(emissionMode) => mudar({ emissionMode })}
          />
          <Marcador
            rotulo="Entrar em contingência offline sozinho quando a SEFAZ não responder"
            marcado={formulario.nfceContingencyEnabled}
            aoMudar={(nfceContingencyEnabled) =>
              alterar((atual) => ({ ...atual, nfceContingencyEnabled }))
            }
          />
        </div>
      </Grupo>
      <Grupo titulo="Transmissão da contingência offline">
        <div className="max-w-3xl space-y-4">
          <Marcador
            rotulo="Exigir senha para transmitir NFC-e em contingência offline"
            marcado={nfce.requireOfflinePassword}
            aoMudar={(requireOfflinePassword) => mudar({ requireOfflinePassword })}
          />
          {nfce.requireOfflinePassword && (
            <CampoSegredo
              rotulo="Senha da contingência"
              className="max-w-xs"
              gravado={gravados.senhaOffline}
              valor={segredos.nfceOfflinePassword}
              aoMudar={(valor) => alterarSegredo('nfceOfflinePassword', valor)}
            />
          )}
          <Nota>Notas em contingência offline precisam ser transmitidas em até 24 horas.</Nota>
        </div>
      </Grupo>
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
    <PainelComAbas etapa="nfce" aba={aba} aoMudarAba={props.aoMudarAba}>
      {aba === 'configuracoes' && <Configuracoes props={props} mudar={mudar} />}
      {aba === 'series' && <AbaNfceSeries nfce={formulario.nfce} mudar={mudar} />}
      {aba === 'danfe' && <Danfe danfe={formulario.nfce.danfe} mudar={mudarDanfe} />}
      {aba === 'forma-emissao' && <FormaDeEmissao props={props} mudar={mudar} />}
      {aba === 'cartao' && <AbaNfceCartao nfce={formulario.nfce} mudar={mudar} />}
    </PainelComAbas>
  );
}
