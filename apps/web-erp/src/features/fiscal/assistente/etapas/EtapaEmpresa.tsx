import { CRTS } from '../assistente.dados';
import {
  formatarCnpj,
  formatarCpf,
  formatarDocumento,
  formatarTelefone,
  soDigitos,
} from '../assistente.formato';
import type { PropsDeEtapa } from '../assistente.tipos';
import { Campo, Escolha, Grupo, Selecao } from '../campos';
import { EnderecoDaEmpresa } from './EnderecoDaEmpresa';
import { alterarEmitente, GRADE } from './grade';

type PropsDoGrupo = Pick<PropsDeEtapa, 'formulario' | 'alterar'>;

function Identificacao({ formulario, alterar }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  const pj = issuer.personType === 'PJ';
  return (
    <Grupo titulo="Identificação">
      <div className={GRADE}>
        <Campo
          rotulo="Razão social"
          className="sm:col-span-6 lg:col-span-7"
          value={issuer.legalName}
          maxLength={120}
          onChange={(e) => emitente({ legalName: e.target.value })}
        />
        <Campo
          rotulo="Nome fantasia"
          className="sm:col-span-6 lg:col-span-5"
          value={issuer.tradeName}
          maxLength={120}
          onChange={(e) => emitente({ tradeName: e.target.value })}
        />
        <div className="sm:col-span-3 lg:col-span-4">
          <Escolha
            rotulo="Pessoa"
            valor={issuer.personType}
            opcoes={[
              { valor: 'PJ', rotulo: 'Jurídica' },
              { valor: 'PF', rotulo: 'Física' },
            ]}
            aoMudar={(personType) => emitente({ personType, document: '' })}
          />
        </div>
        <Campo
          rotulo={pj ? 'CNPJ' : 'CPF'}
          className="sm:col-span-3 lg:col-span-4"
          inputMode="numeric"
          value={pj ? formatarCnpj(issuer.document) : formatarCpf(issuer.document)}
          onChange={(e) => emitente({ document: soDigitos(e.target.value).slice(0, pj ? 14 : 11) })}
        />
      </div>
    </Grupo>
  );
}

function InscricoesERegime({ formulario, alterar }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  return (
    <Grupo titulo="Inscrições e regime tributário">
      <div className={GRADE}>
        <Campo
          rotulo="Inscrição estadual"
          className="sm:col-span-2 lg:col-span-4"
          value={formulario.stateRegistration}
          maxLength={20}
          placeholder="Número ou ISENTO"
          onChange={(e) => alterar((atual) => ({ ...atual, stateRegistration: e.target.value }))}
        />
        <Campo
          rotulo="Inscrição municipal"
          className="sm:col-span-2 lg:col-span-4"
          value={issuer.municipalRegistration}
          maxLength={20}
          onChange={(e) => emitente({ municipalRegistration: e.target.value })}
        />
        <Campo
          rotulo="Inscrição SUFRAMA"
          className="sm:col-span-2 lg:col-span-4"
          inputMode="numeric"
          value={issuer.suframaRegistration}
          onChange={(e) => emitente({ suframaRegistration: soDigitos(e.target.value).slice(0, 9) })}
        />
        <Selecao
          rotulo="CRT — código de regime tributário"
          className="sm:col-span-4 lg:col-span-8"
          valor={formulario.crt}
          opcoes={CRTS}
          aoMudar={(crt) => alterar((atual) => ({ ...atual, crt }))}
        />
        <Campo
          rotulo="CNAE"
          className="sm:col-span-2 lg:col-span-4"
          inputMode="numeric"
          value={issuer.cnae}
          onChange={(e) => emitente({ cnae: soDigitos(e.target.value).slice(0, 7) })}
        />
      </div>
    </Grupo>
  );
}

function Contato({ formulario, alterar }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  const telefone = (chave: 'phone' | 'phone2' | 'fax', rotulo: string) => (
    <Campo
      rotulo={rotulo}
      className="sm:col-span-2 lg:col-span-4"
      inputMode="tel"
      value={formatarTelefone(issuer[chave])}
      onChange={(e) => emitente({ [chave]: soDigitos(e.target.value).slice(0, 11) })}
    />
  );
  return (
    <Grupo titulo="Contato">
      <div className={GRADE}>
        {telefone('phone', 'Telefone 1')}
        {telefone('phone2', 'Telefone 2')}
        {telefone('fax', 'Fax')}
        <Campo
          rotulo="E-mail"
          type="email"
          className="sm:col-span-3 lg:col-span-6"
          value={issuer.email}
          maxLength={120}
          onChange={(e) => emitente({ email: e.target.value.trim() })}
        />
        <Campo
          rotulo="Responsável"
          className="sm:col-span-3 lg:col-span-6"
          value={issuer.responsible}
          maxLength={80}
          onChange={(e) => emitente({ responsible: e.target.value })}
        />
      </div>
    </Grupo>
  );
}

function Contabilista({ formulario, alterar }: PropsDoGrupo) {
  const { issuer } = formulario;
  const emitente = alterarEmitente(alterar);
  return (
    <Grupo
      titulo="Contabilista"
      descricao="Usado para autorizar o escritório de contabilidade a baixar o XML das notas."
    >
      <div className={GRADE}>
        <Campo
          rotulo="CPF ou CNPJ"
          className="sm:col-span-2 lg:col-span-4"
          inputMode="numeric"
          value={formatarDocumento(issuer.accountantDocument)}
          onChange={(e) => emitente({ accountantDocument: soDigitos(e.target.value).slice(0, 14) })}
        />
        <Campo
          rotulo="Nome"
          className="sm:col-span-4 lg:col-span-8"
          value={issuer.accountantName}
          maxLength={120}
          onChange={(e) => emitente({ accountantName: e.target.value })}
        />
      </div>
    </Grupo>
  );
}

export function EtapaEmpresa({ formulario, alterar }: PropsDeEtapa) {
  return (
    <>
      <Identificacao formulario={formulario} alterar={alterar} />
      <InscricoesERegime formulario={formulario} alterar={alterar} />
      <EnderecoDaEmpresa formulario={formulario} alterar={alterar} />
      <Contato formulario={formulario} alterar={alterar} />
      <Contabilista formulario={formulario} alterar={alterar} />
    </>
  );
}
