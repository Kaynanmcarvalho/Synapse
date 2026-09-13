import type { FiscalEnvironment } from '@synapse/types';
import { useOverlayClose, Modal } from '@synapse/ui';
import { ShieldAlert, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { AMBIENTES, PROVEDORES } from '../assistente.dados';
import type { PropsDeEtapa } from '../assistente.tipos';
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  Campo,
  CampoSegredo,
  Grupo,
  Nota,
  Selecao,
} from '../campos';
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
      <button type="button" className={BOTAO_SECUNDARIO} onClick={fechar}>
        Cancelar
      </button>
      <button
        type="button"
        className={BOTAO_PRIMARIO}
        disabled={!podeAtivar}
        onClick={() => {
          aoAtivar();
          fechar();
        }}
      >
        Ativar produção
      </button>
    </>
  );
}

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
      <Campo
        rotulo={`Digite ${FRASE} para confirmar`}
        value={frase}
        autoComplete="off"
        onChange={(e) => setFrase(e.target.value.toUpperCase())}
      />
    </Modal>
  );
}

function AbaWebService({ formulario, alterar, segredos, gravados, alterarSegredo }: PropsDeEtapa) {
  const [confirmando, setConfirmando] = useState(false);
  const escolherAmbiente = (environment: FiscalEnvironment) => {
    if (environment === 'PRODUCAO' && formulario.environment !== 'PRODUCAO') setConfirmando(true);
    else alterar((atual) => ({ ...atual, environment }));
  };
  const gyn = formulario.provider === 'GYN_FISCAL';
  return (
    <Grupo titulo="WebService da SEFAZ">
      <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <Selecao
          rotulo="Estado"
          valor={formulario.state}
          opcoes={[{ valor: formulario.state, rotulo: formulario.state || '—' }]}
          aoMudar={() => undefined}
          disabled
          dica="Vem da UF em Parâmetros da Empresa."
        />
        <Selecao
          rotulo="Ambiente"
          valor={formulario.environment}
          opcoes={AMBIENTES}
          aoMudar={escolherAmbiente}
        />
        <Selecao
          rotulo="Provedor fiscal"
          className="sm:col-span-2"
          valor={formulario.provider}
          opcoes={PROVEDORES}
          aoMudar={(provider) => alterar((atual) => ({ ...atual, provider }))}
        />
        {gyn && (
          <>
            <CampoSegredo
              rotulo="Chave da API do Gyn Fiscal"
              gravado={gravados.chaveProvedor}
              valor={segredos.providerApiKey}
              aoMudar={(valor) => alterarSegredo('providerApiKey', valor)}
            />
            <CampoSegredo
              rotulo="Tenant do Gyn Fiscal"
              gravado={gravados.tenantProvedor}
              valor={segredos.providerTenantId}
              aoMudar={(valor) => alterarSegredo('providerTenantId', valor)}
            />
          </>
        )}
      </div>
      {formulario.environment === 'PRODUCAO' && (
        <div className="mt-6 max-w-2xl">
          <Nota icone={<ShieldAlert size={17} className="text-accent-danger" />}>
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
    </Grupo>
  );
}

function AbaPosMobile() {
  return (
    <Grupo
      titulo="Gerar certificado para POS Mobile"
      descricao="Certificado usado pelas maquininhas POS Mobile para emitir NFC-e."
    >
      <div className="grid max-w-xl gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Campo rotulo="Senha do certificado" type="password" disabled />
        <button type="button" className={BOTAO_SECUNDARIO} disabled>
          Gerar certificado
        </button>
      </div>
      <div className="mt-6 max-w-xl">
        <Nota icone={<Smartphone size={17} />}>
          A geração de certificado para POS Mobile ainda não existe no Synapse. A aba fica no mesmo
          lugar do Syndata e é liberada quando a integração chegar.
        </Nota>
      </div>
    </Grupo>
  );
}

export function EtapaNotaFiscal(props: PropsDeEtapa) {
  return (
    <PainelComAbas etapa="nota-fiscal" aba={props.aba} aoMudarAba={props.aoMudarAba}>
      {props.aba === 'emissao' && <AbaEmissao {...props} />}
      {props.aba === 'webservice' && <AbaWebService {...props} />}
      {props.aba === 'certificado' && <AbaCertificado {...props} />}
      {props.aba === 'pis-cofins' && <AbaPisCofins {...props} />}
      {props.aba === 'pos-mobile' && <AbaPosMobile />}
    </PainelComAbas>
  );
}
