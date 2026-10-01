import { DocInput, Field, Input, Select } from '@synapse/sdl';
import { LinhaDeCampos, Secao } from '../../../../components/formulario/Formulario';
import { LARGURA_DE_CAMPO as L } from '../../../../components/formulario/larguras';
import { CRTS } from '../assistente.dados';
import {
  formatarCnpj,
  formatarCpf,
  formatarDocumento,
  formatarTelefone,
  soDigitos,
} from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { Escolha, OpcoesDoSelect } from '../campos';
import { opcaoEscolhida } from '../opcoes';
import { EnderecoDaEmpresa } from './EnderecoDaEmpresa';
import { alterarEmitente } from './grade';

/** Parâmetros da empresa. Mesmos campos, máscaras e limites de antes; a
 *  largura de cada campo vem do dado (CNAE curto, razão social longa), não de
 *  uma grade de 12 colunas. */

type PropsDoGrupo = Pick<PropsDeEtapa, 'formulario' | 'alterar' | 'erroDoCampo'>;

function Identificacao({ formulario, alterar, erroDoCampo }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  const pj = issuer.personType === 'PJ';
  return (
    <Secao titulo="Identificação">
      <LinhaDeCampos>
        <Field
          label="Razão social"
          className={L.resto}
          data-campo="issuer.legalName"
          error={erroDoCampo('issuer.legalName')}
        >
          <Input
            value={issuer.legalName}
            maxLength={120}
            onChange={(e) => emitente({ legalName: e.target.value })}
          />
        </Field>
        <Field label="Nome fantasia" className={L.resto}>
          <Input
            value={issuer.tradeName}
            maxLength={120}
            onChange={(e) => emitente({ tradeName: e.target.value })}
          />
        </Field>
      </LinhaDeCampos>
      <div className="mt-3">
        <LinhaDeCampos>
          <Escolha
            rotulo="Pessoa"
            valor={issuer.personType}
            opcoes={[
              { valor: 'PJ', rotulo: 'Jurídica' },
              { valor: 'PF', rotulo: 'Física' },
            ]}
            aoMudar={(personType) => emitente({ personType, document: '' })}
          />
          <Field
            label={pj ? 'CNPJ' : 'CPF'}
            className={L.medio}
            data-campo="issuer.document"
            error={erroDoCampo('issuer.document')}
          >
            <DocInput
              value={pj ? formatarCnpj(issuer.document) : formatarCpf(issuer.document)}
              onChange={(e) =>
                emitente({ document: soDigitos(e.target.value).slice(0, pj ? 14 : 11) })
              }
            />
          </Field>
        </LinhaDeCampos>
      </div>
    </Secao>
  );
}

function InscricoesERegime({ formulario, alterar, erroDoCampo }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  return (
    <Secao titulo="Inscrições e regime tributário">
      <LinhaDeCampos>
        <Field
          label="Inscrição estadual"
          className={L.curto}
          data-campo="stateRegistration"
          error={erroDoCampo('stateRegistration')}
        >
          <Input
            className="font-data"
            value={formulario.stateRegistration}
            maxLength={20}
            placeholder="Número ou ISENTO"
            onChange={(e) => alterar((atual) => ({ ...atual, stateRegistration: e.target.value }))}
          />
        </Field>
        <Field label="Inscrição municipal" className={L.curto}>
          <Input
            className="font-data"
            value={issuer.municipalRegistration}
            maxLength={20}
            onChange={(e) => emitente({ municipalRegistration: e.target.value })}
          />
        </Field>
        <Field label="Inscrição SUFRAMA" className={L.curto}>
          <DocInput
            value={issuer.suframaRegistration}
            onChange={(e) =>
              emitente({ suframaRegistration: soDigitos(e.target.value).slice(0, 9) })
            }
          />
        </Field>
        <Field label="CRT — código de regime tributário" className={L.longo}>
          <Select
            value={String(formulario.crt)}
            onChange={(e) => {
              const crt = opcaoEscolhida(CRTS, e.target.value);
              if (crt) alterar((atual) => ({ ...atual, crt }));
            }}
          >
            <OpcoesDoSelect opcoes={CRTS} />
          </Select>
        </Field>
        <Field label="CNAE" className={L.codigo}>
          <DocInput
            value={issuer.cnae}
            onChange={(e) => emitente({ cnae: soDigitos(e.target.value).slice(0, 7) })}
          />
        </Field>
      </LinhaDeCampos>
    </Secao>
  );
}

function Contato({ formulario, alterar, erroDoCampo }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  const telefone = (chave: 'phone' | 'phone2' | 'fax', rotulo: string) => (
    <Field label={rotulo} className={L.curto}>
      <DocInput
        inputMode="tel"
        value={formatarTelefone(issuer[chave])}
        onChange={(e) => emitente({ [chave]: soDigitos(e.target.value).slice(0, 11) })}
      />
    </Field>
  );
  return (
    <Secao titulo="Contato">
      <LinhaDeCampos>
        {telefone('phone', 'Telefone 1')}
        {telefone('phone2', 'Telefone 2')}
        {telefone('fax', 'Fax')}
        <Field
          label="E-mail"
          className={L.resto}
          data-campo="issuer.email"
          error={erroDoCampo('issuer.email')}
        >
          <Input
            type="email"
            value={issuer.email}
            maxLength={120}
            onChange={(e) => emitente({ email: e.target.value.trim() })}
          />
        </Field>
        <Field label="Responsável" className={L.resto}>
          <Input
            value={issuer.responsible}
            maxLength={80}
            onChange={(e) => emitente({ responsible: e.target.value })}
          />
        </Field>
      </LinhaDeCampos>
    </Secao>
  );
}

function Contabilista({ formulario, alterar, erroDoCampo }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  return (
    <Secao
      titulo="Contabilista"
      descricao="Usado para autorizar o escritório de contabilidade a baixar o XML das notas."
    >
      <LinhaDeCampos>
        <Field
          label="CPF ou CNPJ"
          className={L.medio}
          data-campo="issuer.accountantDocument"
          error={erroDoCampo('issuer.accountantDocument')}
        >
          <DocInput
            value={formatarDocumento(issuer.accountantDocument)}
            onChange={(e) =>
              emitente({ accountantDocument: soDigitos(e.target.value).slice(0, 14) })
            }
          />
        </Field>
        <Field label="Nome" className={L.resto}>
          <Input
            value={issuer.accountantName}
            maxLength={120}
            onChange={(e) => emitente({ accountantName: e.target.value })}
          />
        </Field>
      </LinhaDeCampos>
    </Secao>
  );
}

export function EtapaEmpresa({ formulario, alterar, erroDoCampo }: PropsDeEtapa) {
  const grupo = { formulario, alterar, erroDoCampo };
  return (
    <>
      <Identificacao {...grupo} />
      <InscricoesERegime {...grupo} />
      <EnderecoDaEmpresa {...grupo} />
      <Contato {...grupo} />
      <Contabilista {...grupo} />
    </>
  );
}
