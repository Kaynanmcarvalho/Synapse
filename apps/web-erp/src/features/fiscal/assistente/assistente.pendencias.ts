import type { NfceSeriesAssignment } from '@synapse/types';
import { isValidCnpj, isValidCpf, isValidCpfOrCnpj } from '@synapse/validation';
import type {
  EtapaId,
  FormularioFiscal,
  Pendencia,
  SegredosDigitados,
  SegredosGravados,
} from './assistente.tipos';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CFOP_DENTRO = /^5\d{3}$/;
const CFOP_FORA = /^6\d{3}$/;
const MAIOR_NUMERO = 999_999_999;

const vazio = (valor: string): boolean => valor.trim() === '';
const invalidoSePreenchido = (valor: string, validar: (texto: string) => boolean): boolean =>
  valor !== '' && !validar(valor);
const inteiroEntre = (valor: number, minimo: number, maximo: number): boolean =>
  Number.isInteger(valor) && valor >= minimo && valor <= maximo;

/** [falhou, mensagem, bloqueia salvar, aba, campo]. `campo` so diz ONDE a
 *  regra aparece na tela (Fase 8) — nao muda quando ela falha. */
type Regra = readonly [boolean, string, boolean, (string | undefined)?, string?];

const coletar = (etapa: EtapaId, regras: readonly Regra[]): Pendencia[] =>
  regras
    .filter(([falhou]) => falhou)
    .map(([, mensagem, bloqueia, aba, campo]) => ({
      etapa,
      mensagem,
      bloqueia,
      ...(aba ? { aba } : {}),
      ...(campo ? { campo } : {}),
    }));

const daEmpresa = (formulario: FormularioFiscal): Pendencia[] => {
  const { issuer } = formulario;
  const { address } = issuer;
  const pj = issuer.personType === 'PJ';
  const documento = pj ? 'CNPJ' : 'CPF';
  return coletar('empresa', [
    [vazio(issuer.legalName), 'Informe a razão social.', false, undefined, 'issuer.legalName'],
    [
      vazio(issuer.document),
      `Informe o ${documento} do emitente.`,
      false,
      undefined,
      'issuer.document',
    ],
    [
      invalidoSePreenchido(issuer.document, pj ? isValidCnpj : isValidCpf),
      `${documento} do emitente inválido.`,
      true,
      undefined,
      'issuer.document',
    ],
    [
      formulario.stateRegistration.trim().length < 2,
      'Informe a inscrição estadual (ou ISENTO).',
      true,
      undefined,
      'stateRegistration',
    ],
    [vazio(formulario.state), 'Selecione a UF.', true, undefined, 'state'],
    [
      address.zipCode.length !== 8,
      'Informe o CEP com 8 dígitos.',
      false,
      undefined,
      'issuer.address.zipCode',
    ],
    [
      [address.street, address.number, address.district, address.cityName].some(vazio),
      'Complete o endereço: logradouro, número, bairro e cidade.',
      false,
    ],
    [
      address.cityCode.length !== 7,
      'Informe o código IBGE da cidade (7 dígitos).',
      false,
      undefined,
      'issuer.address.cityCode',
    ],
    [
      invalidoSePreenchido(issuer.email, (email) => EMAIL.test(email)),
      'E-mail da empresa inválido.',
      true,
      undefined,
      'issuer.email',
    ],
    [
      invalidoSePreenchido(issuer.accountantDocument, isValidCpfOrCnpj),
      'CPF/CNPJ do contabilista inválido.',
      true,
      undefined,
      'issuer.accountantDocument',
    ],
  ]);
};

const daNotaFiscal = (
  formulario: FormularioFiscal,
  segredos: SegredosDigitados,
  gravados: SegredosGravados,
): Pendencia[] => {
  const { emission, email, pisCofins } = formulario;
  const gyn = formulario.provider === 'GYN_FISCAL';
  const aliquotaForaDoIntervalo = [pisCofins.outbound, pisCofins.inbound].some((padrao) =>
    [padrao.baseReductionPercent, padrao.pisRate, padrao.cofinsRate].some(
      (v) => !(v >= 0 && v <= 100),
    ),
  );
  return coletar('nota-fiscal', [
    [
      invalidoSePreenchido(emission.xmlDownloadDocument, isValidCpfOrCnpj),
      'CPF/CNPJ autorizado a baixar o XML é inválido.',
      true,
      'emissao',
      'emission.xmlDownloadDocument',
    ],
    [
      invalidoSePreenchido(emission.paymentBeneficiaryCnpj, isValidCnpj),
      'CNPJ do beneficiário do pagamento é inválido.',
      true,
      'emissao',
      'emission.paymentBeneficiaryCnpj',
    ],
    [
      invalidoSePreenchido(email.senderEmail, (v) => EMAIL.test(v)),
      'E-mail do remetente inválido.',
      true,
      'emissao',
    ],
    [
      emission.autoSendEmail && vazio(email.host),
      'Configure o servidor de e-mail para o envio automático.',
      false,
      'emissao',
    ],
    [
      formulario.environment === 'PRODUCAO' && !gyn,
      'Produção exige o provedor Gyn Fiscal.',
      true,
      'webservice',
      'provider',
    ],
    [
      gyn && !gravados.chaveProvedor && vazio(segredos.providerApiKey),
      'Informe a chave da API do Gyn Fiscal.',
      false,
      'webservice',
    ],
    [
      gyn && !gravados.tenantProvedor && vazio(segredos.providerTenantId),
      'Informe o tenant do Gyn Fiscal.',
      false,
      'webservice',
    ],
    [
      gyn && !gravados.certificado && vazio(segredos.certificateBase64),
      'Envie o certificado digital A1.',
      false,
      'certificado',
    ],
    [
      !vazio(segredos.certificateBase64) && vazio(segredos.certificatePassword),
      'Informe a senha do certificado enviado.',
      true,
      'certificado',
      'segredo.certificatePassword',
    ],
    [
      aliquotaForaDoIntervalo,
      'Alíquotas e redução de PIS/COFINS ficam entre 0 e 100%.',
      true,
      'pis-cofins',
    ],
  ]);
};

const daNfe = ({ nfeSeries, nfe }: FormularioFiscal): Pendencia[] =>
  coletar('nfe', [
    [
      !CFOP_DENTRO.test(nfe.cfopInState),
      'CFOP dentro do estado começa com 5 (ex.: 5.102).',
      true,
      'configuracoes',
      'nfe.cfopInState',
    ],
    [
      !CFOP_FORA.test(nfe.cfopOutOfState),
      'CFOP fora do estado começa com 6 (ex.: 6.102).',
      true,
      'configuracoes',
      'nfe.cfopOutOfState',
    ],
    [
      vazio(nfe.operationNature),
      'Informe a natureza da operação.',
      true,
      'configuracoes',
      'nfe.operationNature',
    ],
    [
      !inteiroEntre(nfeSeries, 1, 999),
      'A série da NF-e vai de 1 a 999.',
      true,
      'series',
      'nfeSeries',
    ],
    [
      !inteiroEntre(nfe.nextNumber, 1, MAIOR_NUMERO),
      'Informe o próximo número da NF-e.',
      true,
      'series',
      'nfe.nextNumber',
    ],
  ]);

/** As mesmas regras de série da NFC-e que bloqueiam o F8, vistas por linha —
 *  a grade de séries marca a célula/linha com ELAS, não com uma cópia. Não há
 *  regra nova aqui: `daNfce` usa esta função para a pendência do formulário. */
export interface ProblemasDaLinhaDeSerie {
  readonly identificador: boolean;
  readonly serie: boolean;
  readonly proximoNumero: boolean;
  /** Identificador preenchido que se repete em outra linha. */
  readonly repetida: boolean;
}

export const problemasDaLinhaDeSerie = (
  linha: NfceSeriesAssignment,
  todas: readonly NfceSeriesAssignment[],
): ProblemasDaLinhaDeSerie => {
  const identificador = linha.identifier.trim();
  return {
    identificador: vazio(linha.identifier),
    serie: !inteiroEntre(linha.series, 1, 999),
    proximoNumero: !inteiroEntre(linha.nextNumber, 1, MAIOR_NUMERO),
    repetida:
      identificador !== '' &&
      todas.filter((outra) => outra.identifier.trim() === identificador).length > 1,
  };
};

const daNfce = (
  formulario: FormularioFiscal,
  segredos: SegredosDigitados,
  gravados: SegredosGravados,
): Pendencia[] => {
  const { nfce } = formulario;
  const identificadores = nfce.series.map((linha) => linha.identifier.trim());
  const linhaIncompleta = nfce.series.some((linha) => {
    const problemas = problemasDaLinhaDeSerie(linha, nfce.series);
    return problemas.identificador || problemas.serie || problemas.proximoNumero;
  });
  const senha = segredos.nfceOfflinePassword;
  const semCsc = vazio(formulario.cscId) || (!gravados.csc && vazio(segredos.csc));
  return coletar('nfce', [
    [
      !CFOP_DENTRO.test(nfce.cfopInState),
      'CFOP dentro do estado começa com 5 (ex.: 5.102).',
      true,
      'configuracoes',
      'nfce.cfopInState',
    ],
    [
      formulario.provider !== 'MOCK' && semCsc,
      'Informe o identificador e o CSC da NFC-e.',
      false,
      'configuracoes',
    ],
    [nfce.series.length === 0, 'Cadastre ao menos uma série para a NFC-e.', false, 'series'],
    [
      linhaIncompleta,
      'Cada linha precisa de identificador, série (1 a 999) e próximo número.',
      true,
      'series',
    ],
    [
      new Set(identificadores).size !== identificadores.length,
      'Um terminal ou usuário aparece em mais de uma linha.',
      true,
      'series',
    ],
    [
      senha !== '' && senha.length < 4,
      'A senha da contingência precisa de ao menos 4 caracteres.',
      true,
      'forma-emissao',
      'segredo.nfceOfflinePassword',
    ],
    [
      nfce.requireOfflinePassword && !gravados.senhaOffline && senha === '',
      'Defina a senha da contingência offline.',
      true,
      'forma-emissao',
      'segredo.nfceOfflinePassword',
    ],
  ]);
};

export const listarPendencias = (
  formulario: FormularioFiscal,
  segredos: SegredosDigitados,
  gravados: SegredosGravados,
): Pendencia[] => [
  ...daEmpresa(formulario),
  ...daNotaFiscal(formulario, segredos, gravados),
  ...daNfe(formulario),
  ...daNfce(formulario, segredos, gravados),
];
