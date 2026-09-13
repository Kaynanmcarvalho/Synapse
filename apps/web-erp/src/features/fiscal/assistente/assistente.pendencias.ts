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

/** [falhou, mensagem, bloqueia salvar, aba] */
type Regra = readonly [boolean, string, boolean, string?];

const coletar = (etapa: EtapaId, regras: readonly Regra[]): Pendencia[] =>
  regras
    .filter(([falhou]) => falhou)
    .map(([, mensagem, bloqueia, aba]) => ({ etapa, mensagem, bloqueia, ...(aba ? { aba } : {}) }));

const daEmpresa = (formulario: FormularioFiscal): Pendencia[] => {
  const { issuer } = formulario;
  const { address } = issuer;
  const pj = issuer.personType === 'PJ';
  const documento = pj ? 'CNPJ' : 'CPF';
  return coletar('empresa', [
    [vazio(issuer.legalName), 'Informe a razão social.', false],
    [vazio(issuer.document), `Informe o ${documento} do emitente.`, false],
    [
      invalidoSePreenchido(issuer.document, pj ? isValidCnpj : isValidCpf),
      `${documento} do emitente inválido.`,
      true,
    ],
    [
      formulario.stateRegistration.trim().length < 2,
      'Informe a inscrição estadual (ou ISENTO).',
      true,
    ],
    [vazio(formulario.state), 'Selecione a UF.', true],
    [address.zipCode.length !== 8, 'Informe o CEP com 8 dígitos.', false],
    [
      [address.street, address.number, address.district, address.cityName].some(vazio),
      'Complete o endereço: logradouro, número, bairro e cidade.',
      false,
    ],
    [address.cityCode.length !== 7, 'Informe o código IBGE da cidade (7 dígitos).', false],
    [
      invalidoSePreenchido(issuer.email, (email) => EMAIL.test(email)),
      'E-mail da empresa inválido.',
      true,
    ],
    [
      invalidoSePreenchido(issuer.accountantDocument, isValidCpfOrCnpj),
      'CPF/CNPJ do contabilista inválido.',
      true,
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
    ],
    [
      invalidoSePreenchido(emission.paymentBeneficiaryCnpj, isValidCnpj),
      'CNPJ do beneficiário do pagamento é inválido.',
      true,
      'emissao',
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
    ],
    [
      !CFOP_FORA.test(nfe.cfopOutOfState),
      'CFOP fora do estado começa com 6 (ex.: 6.102).',
      true,
      'configuracoes',
    ],
    [vazio(nfe.operationNature), 'Informe a natureza da operação.', true, 'configuracoes'],
    [!inteiroEntre(nfeSeries, 1, 999), 'A série da NF-e vai de 1 a 999.', true, 'series'],
    [
      !inteiroEntre(nfe.nextNumber, 1, MAIOR_NUMERO),
      'Informe o próximo número da NF-e.',
      true,
      'series',
    ],
  ]);

const daNfce = (
  formulario: FormularioFiscal,
  segredos: SegredosDigitados,
  gravados: SegredosGravados,
): Pendencia[] => {
  const { nfce } = formulario;
  const identificadores = nfce.series.map((linha) => linha.identifier.trim());
  const linhaIncompleta = nfce.series.some(
    (linha) =>
      vazio(linha.identifier) ||
      !inteiroEntre(linha.series, 1, 999) ||
      !inteiroEntre(linha.nextNumber, 1, MAIOR_NUMERO),
  );
  const senha = segredos.nfceOfflinePassword;
  const semCsc = vazio(formulario.cscId) || (!gravados.csc && vazio(segredos.csc));
  return coletar('nfce', [
    [
      !CFOP_DENTRO.test(nfce.cfopInState),
      'CFOP dentro do estado começa com 5 (ex.: 5.102).',
      true,
      'configuracoes',
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
    ],
    [
      nfce.requireOfflinePassword && !gravados.senhaOffline && senha === '',
      'Defina a senha da contingência offline.',
      true,
      'forma-emissao',
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
