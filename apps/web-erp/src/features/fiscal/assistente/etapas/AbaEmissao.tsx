import type { FiscalEmailSettings, FiscalEmissionSettings } from '@synapse/types';
import { useOverlayClose, Modal } from '@synapse/ui';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { CONTEUDO_DO_FATURAMENTO, OPCOES_DE_EMISSAO } from '../assistente.dados';
import { formatarCnpj, formatarDocumento, lerInteiro, soDigitos } from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  Campo,
  CampoSegredo,
  Grupo,
  Marcador,
  Selecao,
} from '../campos';

const SEGURANCA = [
  { valor: 'STARTTLS', rotulo: 'STARTTLS (porta 587)' },
  { valor: 'SSL', rotulo: 'SSL/TLS (porta 465)' },
  { valor: 'NONE', rotulo: 'Sem criptografia' },
] as const;

function Concluir() {
  const fechar = useOverlayClose();
  return (
    <button type="button" className={`${BOTAO_PRIMARIO} ml-auto`} onClick={fechar}>
      Concluir
    </button>
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
      <div className="grid gap-5 sm:grid-cols-6">
        <Campo
          rotulo="Servidor SMTP"
          className="sm:col-span-4"
          value={email.host}
          maxLength={120}
          placeholder="smtp.seudominio.com.br"
          onChange={(e) => mudar({ host: e.target.value.trim() })}
        />
        <Campo
          rotulo="Porta"
          className="sm:col-span-2"
          inputMode="numeric"
          value={String(email.port)}
          onChange={(e) => mudar({ port: Math.min(lerInteiro(e.target.value), 65535) })}
        />
        <Selecao
          rotulo="Segurança"
          className="sm:col-span-3"
          valor={email.security}
          opcoes={SEGURANCA}
          aoMudar={(security) => mudar({ security })}
        />
        <Campo
          rotulo="Usuário"
          className="sm:col-span-3"
          value={email.username}
          maxLength={120}
          autoComplete="off"
          onChange={(e) => mudar({ username: e.target.value.trim() })}
        />
        <CampoSegredo
          rotulo="Senha do e-mail"
          className="sm:col-span-3"
          gravado={gravados.senhaSmtp}
          valor={segredos.smtpPassword}
          aoMudar={(valor) => alterarSegredo('smtpPassword', valor)}
        />
        <Campo
          rotulo="E-mail do remetente"
          type="email"
          className="sm:col-span-3"
          value={email.senderEmail}
          maxLength={120}
          onChange={(e) => mudar({ senderEmail: e.target.value.trim() })}
        />
        <Campo
          rotulo="Nome do remetente"
          className="sm:col-span-6"
          value={email.senderName}
          maxLength={80}
          onChange={(e) => mudar({ senderName: e.target.value })}
        />
      </div>
    </Modal>
  );
}

export function AbaEmissao(props: PropsDeEtapa) {
  const { formulario, alterar } = props;
  const { emission, email } = formulario;
  const [configurandoEmail, setConfigurandoEmail] = useState(false);
  const mudar = (parcial: Partial<FiscalEmissionSettings>) =>
    alterar((atual) => ({ ...atual, emission: { ...atual.emission, ...parcial } }));

  return (
    <>
      <Grupo titulo="Emissão">
        <div className="grid gap-x-8 lg:grid-cols-2">
          {OPCOES_DE_EMISSAO.map((opcao) => (
            <div key={opcao.chave}>
              <Marcador
                rotulo={opcao.rotulo}
                marcado={emission[opcao.chave]}
                aoMudar={(marcado) => mudar({ [opcao.chave]: marcado })}
              />
              {opcao.chave === 'billingInOrderNote' && (
                <Selecao
                  rotulo="Faturamento na observação com"
                  className="mb-3 ml-[30px] max-w-xs"
                  valor={emission.billingNoteContent}
                  opcoes={CONTEUDO_DO_FATURAMENTO}
                  disabled={!emission.billingInOrderNote}
                  aoMudar={(billingNoteContent) => mudar({ billingNoteContent })}
                />
              )}
            </div>
          ))}
        </div>
      </Grupo>

      <Grupo titulo="Autorização de download e pagamento">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Campo
            rotulo="CPF/CNPJ autorizado a baixar o XML"
            inputMode="numeric"
            value={formatarDocumento(emission.xmlDownloadDocument)}
            onChange={(e) => mudar({ xmlDownloadDocument: soDigitos(e.target.value).slice(0, 14) })}
          />
          <Campo
            rotulo="CNPJ do estabelecimento beneficiário do pagamento"
            inputMode="numeric"
            value={formatarCnpj(emission.paymentBeneficiaryCnpj)}
            onChange={(e) =>
              mudar({ paymentBeneficiaryCnpj: soDigitos(e.target.value).slice(0, 14) })
            }
          />
        </div>
      </Grupo>

      <Grupo titulo="E-mail">
        <div className="border-hairline-light flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
          <span className="bg-surface-soft text-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Mail size={19} aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="text-body-sm text-ink block font-semibold">
              {email.host ? `${email.host}:${email.port}` : 'Servidor de e-mail não configurado'}
            </span>
            <span className="text-caption text-stone block">
              {email.senderEmail || 'Defina o servidor e o remetente das notas.'}
            </span>
          </span>
          <button
            type="button"
            className={BOTAO_SECUNDARIO}
            onClick={() => setConfigurandoEmail(true)}
          >
            Configurar e-mail
          </button>
        </div>
        <div className="mt-3">
          <Marcador
            rotulo="Enviar e-mail automático na emissão da nota fiscal"
            marcado={emission.autoSendEmail}
            aoMudar={(autoSendEmail) => mudar({ autoSendEmail })}
          />
        </div>
      </Grupo>
      {configurandoEmail && (
        <ConfigurarEmail {...props} aoFechar={() => setConfigurandoEmail(false)} />
      )}
    </>
  );
}
