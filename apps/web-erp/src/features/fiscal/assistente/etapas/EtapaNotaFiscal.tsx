import { Button, Field, Input, Select } from '@synapse/sdl';
import type { FiscalEnvironment } from '@synapse/types';
import { Modal, useOverlayClose } from '@synapse/ui';
import { ShieldAlert, Smartphone } from 'lucide-react';
import { useState } from 'react';
import {
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { AMBIENTES, PROVEDORES } from '../assistente.dados';
import type { PropsDeEtapa } from '../assistente.tipos';
import { CampoSegredo, Nota, OpcoesDoSelect } from '../campos';
import { opcaoEscolhida } from '../opcoes';
import { AbaCertificado } from './AbaCertificado';
import { AbaEmissao } from './AbaEmissao';
import { AbaPisCofins } from './AbaPisCofins';
import { PainelComAbas } from './PainelComAbas';

const FRASE = 'ATIVAR PRODUCAO';

function RodapeDaConfirmacao({
  podeAtivar,
  aoAtivar,
}: {
  readonly podeAtivar: boolean;
  readonly aoAtivar: () => void;
}) {
  const fechar = useOverlayClose();
  return (
    <>
      <Button variant="quiet" onClick={fechar}>
        Cancelar
      </Button>
      <Button
        variant="danger"
        disabled={!podeAtivar}
        onClick={() => {
          aoAtivar();
          fechar();
        }}
      >
        Ativar produção
      </Button>
    </>
  );
}

/** A confirmação de produção é a mesma (frase digitada, mesmo Modal); só os
 *  controles passaram para o SDL. */
function ConfirmarProducao({
  aoFechar,
  aoAtivar,
}: {
  readonly aoFechar: () => void;
  readonly aoAtivar: () => void;
}) {
  const [frase, setFrase] = useState('');
  return (
    <Modal
      onClose={aoFechar}
      size="sm"
      title="Emitir em produção"
      description="Notas autorizadas em produção têm validade fiscal: depois só podem ser canceladas ou inutilizadas, nunca apagadas."
      footer={<RodapeDaConfirmacao podeAtivar={frase === FRASE} aoAtivar={aoAtivar} />}
    >
      <Field label={`Digite ${FRASE} para confirmar`}>
        <Input
          value={frase}
          autoComplete="off"
          className="font-data"
          onChange={(e) => setFrase(e.target.value.toUpperCase())}
        />
      </Field>
    </Modal>
  );
}

/** Credenciais do provedor Gyn Fiscal — só existem quando ele é o escolhido. */
function SegredosDoGyn({ segredos, gravados, alterarSegredo }: PropsDeEtapa) {
  return (
    <div className="mt-3">
      <LinhaDeCampos>
        <CampoSegredo
          rotulo="Chave da API do Gyn Fiscal"
          className={L.longo}
          gravado={gravados.chaveProvedor}
          valor={segredos.providerApiKey}
          aoMudar={(valor) => alterarSegredo('providerApiKey', valor)}
        />
        <CampoSegredo
          rotulo="Tenant do Gyn Fiscal"
          className={L.longo}
          gravado={gravados.tenantProvedor}
          valor={segredos.providerTenantId}
          aoMudar={(valor) => alterarSegredo('providerTenantId', valor)}
        />
      </LinhaDeCampos>
    </div>
  );
}

function AbaWebService(props: PropsDeEtapa) {
  const { formulario, alterar, erroDoCampo } = props;
  const [confirmando, setConfirmando] = useState(false);
  const escolherAmbiente = (environment: FiscalEnvironment) => {
    if (environment === 'PRODUCAO' && formulario.environment !== 'PRODUCAO') setConfirmando(true);
    else alterar((atual) => ({ ...atual, environment }));
  };
  const gyn = formulario.provider === 'GYN_FISCAL';
  return (
    <Secao titulo="WebService da SEFAZ">
      {/* Estado não se edita aqui: vinha num select desabilitado. */}
      <ValoresDeLeitura
        itens={[
          {
            rotulo: 'Estado (vem da UF em Parâmetros da Empresa)',
            valor: formulario.state || '—',
            dado: true,
          },
        ]}
      />
      <div className="mt-4">
        <LinhaDeCampos>
          <Field label="Ambiente" className={L.medio}>
            <Select
              value={formulario.environment}
              onChange={(e) => {
                const ambiente = opcaoEscolhida(AMBIENTES, e.target.value);
                if (ambiente) escolherAmbiente(ambiente);
              }}
            >
              <OpcoesDoSelect opcoes={AMBIENTES} />
            </Select>
          </Field>
          <Field
            label="Provedor fiscal"
            className={L.longo}
            data-campo="provider"
            error={erroDoCampo('provider')}
          >
            <Select
              value={formulario.provider}
              onChange={(e) => {
                const provider = opcaoEscolhida(PROVEDORES, e.target.value);
                if (provider) alterar((atual) => ({ ...atual, provider }));
              }}
            >
              <OpcoesDoSelect opcoes={PROVEDORES} />
            </Select>
          </Field>
        </LinhaDeCampos>
      </div>
      {gyn && <SegredosDoGyn {...props} />}
      {formulario.environment === 'PRODUCAO' && (
        <div className="mt-5">
          <Nota icone={<ShieldAlert size={14} className="text-status-perigo" />}>
            Ambiente de produção: as notas emitidas têm validade fiscal.
          </Nota>
        </div>
      )}
      {confirmando && (
        <ConfirmarProducao
          aoFechar={() => setConfirmando(false)}
          aoAtivar={() => alterar((atual) => ({ ...atual, environment: 'PRODUCAO' }))}
        />
      )}
    </Secao>
  );
}

/** Ainda não existe: controles desabilitados de verdade (poderiam ser
 *  editados quando a integração chegar), com a explicação ao lado. */
function AbaPosMobile() {
  return (
    <Secao
      titulo="Gerar certificado para POS Mobile"
      descricao="Certificado usado pelas maquininhas POS Mobile para emitir NFC-e."
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Senha do certificado" className={L.medio} disabled>
          <Input type="password" />
        </Field>
        <Button variant="secondary" disabled>
          Gerar certificado
        </Button>
      </div>
      <div className="mt-5">
        <Nota icone={<Smartphone size={14} />}>
          A geração de certificado para POS Mobile ainda não existe no Synapse. A aba fica no mesmo
          lugar do Syndata e é liberada quando a integração chegar.
        </Nota>
      </div>
    </Secao>
  );
}

export function EtapaNotaFiscal(props: PropsDeEtapa) {
  return (
    <PainelComAbas
      etapa="nota-fiscal"
      aba={props.aba}
      aoMudarAba={props.aoMudarAba}
      pendencias={props.pendencias}
    >
      {props.aba === 'emissao' && <AbaEmissao {...props} />}
      {props.aba === 'webservice' && <AbaWebService {...props} />}
      {props.aba === 'certificado' && <AbaCertificado {...props} />}
      {props.aba === 'pis-cofins' && <AbaPisCofins {...props} />}
      {props.aba === 'pos-mobile' && <AbaPosMobile />}
    </PainelComAbas>
  );
}
