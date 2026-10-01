import { Button, DocInput, Field, Input, Select } from '@synapse/sdl';
import type { FiscalEmailSettings, FiscalEmissionSettings } from '@synapse/types';
import { Modal, useOverlayClose } from '@synapse/ui';
import { useState } from 'react';
import {
  LinhaDeCampos,
  Secao,
  ValoresDeLeitura,
} from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { CONTEUDO_DO_FATURAMENTO, OPCOES_DE_EMISSAO } from '../assistente.dados';
import { formatarCnpj, formatarDocumento, lerInteiro, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { CampoSegredo, Marcador, OpcoesDoSelect } from '../campos';
import { opcaoEscolhida } from '../opcoes';

/** Aba "Emissão e E-mail" (Fase 8): três assuntos com responsabilidade
 *  própria — as opções de emissão, quem pode baixar/receber, e o e-mail. */

const SEGURANCA = [
  { valor: 'STARTTLS', rotulo: 'STARTTLS (porta 587)' },
  { valor: 'SSL', rotulo: 'SSL/TLS (porta 465)' },
  { valor: 'NONE', rotulo: 'Sem criptografia' },
] as const;

type MudarEmissao = (parcial: Partial<FiscalEmissionSettings>) => void;

function Concluir() {
  const fechar = useOverlayClose();
  return (
    <Button variant="primary" className="ml-auto" onClick={fechar}>
      Concluir
    </Button>
  );
}

function ConfigurarEmail({
  formulario,
  alterar,
  segredos,
  gravados,
  alterarSegredo,
  aoFechar,
}: PropsDeEtapa & { readonly aoFechar: () => void }) {
  const { email } = formulario;
  const mudar = (parcial: Partial<FiscalEmailSettings>) =>
    alterar((atual) => ({ ...atual, email: { ...atual.email, ...parcial } }));
  return (
    <Modal
      onClose={aoFechar}
      size="lg"
      title="Configurar e-mail"
      description="Servidor usado para enviar o XML e o DANFE ao destinatário."
      footer={<Concluir />}
    >
      <div className="space-y-3">
        <ServidorSmtp email={email} mudar={mudar} />
        <LinhaDeCampos>
          <CampoSegredo
            rotulo="Senha do e-mail"
            className={L.medio}
            gravado={gravados.senhaSmtp}
            valor={segredos.smtpPassword}
            aoMudar={(valor) => alterarSegredo('smtpPassword', valor)}
          />
          <Field label="E-mail do remetente" className={L.resto}>
            <Input
              type="email"
              value={email.senderEmail}
              maxLength={120}
              onChange={(e) => mudar({ senderEmail: e.target.value.trim() })}
            />
          </Field>
        </LinhaDeCampos>
        <Field label="Nome do remetente">
          <Input
            value={email.senderName}
            maxLength={80}
            onChange={(e) => mudar({ senderName: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}

/** Servidor, porta, segurança e usuário do SMTP — mesmos limites e parse. */
function ServidorSmtp({
  email,
  mudar,
}: {
  readonly email: FiscalEmailSettings;
  readonly mudar: (parcial: Partial<FiscalEmailSettings>) => void;
}) {
  return (
    <>
      <LinhaDeCampos>
        <Field label="Servidor SMTP" className={L.resto}>
          <Input
            value={email.host}
            maxLength={120}
            placeholder="smtp.seudominio.com.br"
            onChange={(e) => mudar({ host: e.target.value.trim() })}
          />
        </Field>
        <Field label="Porta" className={L.codigo}>
          {/* Mesmo parse de antes (lerInteiro + teto); só o alinhamento é de número. */}
          <Input
            align="right"
            inputMode="numeric"
            value={String(email.port)}
            onChange={(e) => mudar({ port: Math.min(lerInteiro(e.target.value), 65535) })}
          />
        </Field>
      </LinhaDeCampos>
      <LinhaDeCampos>
        <Field label="Segurança" className={L.medio}>
          <Select
            value={email.security}
            onChange={(e) => {
              const security = opcaoEscolhida(SEGURANCA, e.target.value);
              if (security) mudar({ security });
            }}
          >
            <OpcoesDoSelect opcoes={SEGURANCA} />
          </Select>
        </Field>
        <Field label="Usuário" className={L.resto}>
          <Input
            value={email.username}
            maxLength={120}
            autoComplete="off"
            onChange={(e) => mudar({ username: e.target.value.trim() })}
          />
        </Field>
      </LinhaDeCampos>
    </>
  );
}

function OpcoesDeEmissao({
  emission,
  mudar,
}: {
  readonly emission: FiscalEmissionSettings;
  readonly mudar: MudarEmissao;
}) {
  return (
    <Secao titulo="Emissão">
      <div className="grid gap-x-10 gap-y-0.5 lg:grid-cols-2">
        {OPCOES_DE_EMISSAO.map((opcao) => (
          <div key={opcao.chave}>
            <Marcador
              rotulo={opcao.rotulo}
              marcado={emission[opcao.chave]}
              aoMudar={(marcado) => mudar({ [opcao.chave]: marcado })}
            />
            {opcao.chave === 'billingInOrderNote' && (
              <Field
                label="Faturamento na observação com"
                className={`${L.medio} mb-2 ml-6`}
                disabled={!emission.billingInOrderNote}
              >
                <Select
                  value={emission.billingNoteContent}
                  onChange={(e) => {
                    const billingNoteContent = opcaoEscolhida(
                      CONTEUDO_DO_FATURAMENTO,
                      e.target.value,
                    );
                    if (billingNoteContent) mudar({ billingNoteContent });
                  }}
                >
                  <OpcoesDoSelect opcoes={CONTEUDO_DO_FATURAMENTO} />
                </Select>
              </Field>
            )}
          </div>
        ))}
      </div>
    </Secao>
  );
}

function AutorizacaoDeDownload({
  emission,
  mudar,
  erroDoCampo,
}: {
  readonly emission: FiscalEmissionSettings;
  readonly mudar: MudarEmissao;
  readonly erroDoCampo: PropsDeEtapa['erroDoCampo'];
}) {
  return (
    <Secao titulo="Autorização de download e pagamento">
      <LinhaDeCampos>
        <Field
          label="CPF/CNPJ autorizado a baixar o XML"
          className={L.longo}
          data-campo="emission.xmlDownloadDocument"
          error={erroDoCampo('emission.xmlDownloadDocument')}
        >
          <DocInput
            value={formatarDocumento(emission.xmlDownloadDocument)}
            onChange={(e) => mudar({ xmlDownloadDocument: soDigitos(e.target.value).slice(0, 14) })}
          />
        </Field>
        <Field
          label="CNPJ do estabelecimento beneficiário do pagamento"
          className={L.longo}
          data-campo="emission.paymentBeneficiaryCnpj"
          error={erroDoCampo('emission.paymentBeneficiaryCnpj')}
        >
          <DocInput
            value={formatarCnpj(emission.paymentBeneficiaryCnpj)}
            onChange={(e) =>
              mudar({ paymentBeneficiaryCnpj: soDigitos(e.target.value).slice(0, 14) })
            }
          />
        </Field>
      </LinhaDeCampos>
    </Secao>
  );
}

/** O e-mail é configurado num Modal; aqui fica o resumo em texto (leitura),
 *  a ação de configurar e a opção de envio automático. */
function Email(props: PropsDeEtapa & { readonly mudar: MudarEmissao }) {
  const { email, emission } = props.formulario;
  const [configurando, setConfigurando] = useState(false);
  return (
    <Secao
      titulo="E-mail"
      acao={
        <Button variant="secondary" onClick={() => setConfigurando(true)}>
          Configurar e-mail
        </Button>
      }
    >
      <ValoresDeLeitura
        itens={[
          {
            rotulo: 'Servidor',
            valor: email.host ? `${email.host}:${email.port}` : 'Não configurado',
            dado: Boolean(email.host),
          },
          { rotulo: 'Remetente', valor: email.senderEmail || '—' },
        ]}
      />
      <div className="mt-3">
        <Marcador
          rotulo="Enviar e-mail automático na emissão da nota fiscal"
          marcado={emission.autoSendEmail}
          aoMudar={(autoSendEmail) => props.mudar({ autoSendEmail })}
        />
      </div>
      {configurando && <ConfigurarEmail {...props} aoFechar={() => setConfigurando(false)} />}
    </Secao>
  );
}

export function AbaEmissao(props: PropsDeEtapa) {
  const { formulario, alterar } = props;
  const mudar: MudarEmissao = (parcial) =>
    alterar((atual) => ({ ...atual, emission: { ...atual.emission, ...parcial } }));
  return (
    <>
      <OpcoesDeEmissao emission={formulario.emission} mudar={mudar} />
      <AutorizacaoDeDownload
        emission={formulario.emission}
        mudar={mudar}
        erroDoCampo={props.erroDoCampo}
      />
      <Email {...props} mudar={mudar} />
    </>
  );
}
