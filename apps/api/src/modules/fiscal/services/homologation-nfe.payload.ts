import { BadRequestException } from '@nestjs/common';
import type { FiscalCompanyConfig, FiscalIssuer, PisCofinsDefault } from '@synapse/types';

/** NF-e de teste do botao "Teste de homologacao" da Central de Integracoes: usa os
 *  dados do Assistente de Configuracao de NF-e e e cancelada logo depois. */

/** Texto que a SEFAZ exige no destinatario e no produto em homologacao. */
export const HOMOLOGATION_NAME = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';
/** CPF valido reservado aos testes de homologacao. */
const TEST_CPF = '70382211162';
const TEST_NCM = '21069090';
const TEST_AMOUNT = 1;
/** Aliquota so da nota de teste; a nota nasce e morre no ambiente de homologacao. */
const TEST_ICMS_RATE = 18;

const PIS_COFINS_FALLBACK: PisCofinsDefault = {
  cst: '01',
  baseReductionPercent: 0,
  pisRate: 1.65,
  cofinsRate: 7.6,
  revenueNature: '',
};

const money = (value: number): number => Math.round(value * 100) / 100;

/** Sem os Parametros da Empresa a SEFAZ recusaria por falta de emitente. */
const requireIssuer = (config: FiscalCompanyConfig): FiscalIssuer => {
  const issuer = config.issuer ?? null;
  const missing = (
    [
      [!issuer?.document, 'CNPJ'],
      [!issuer?.legalName, 'razão social'],
      [!issuer?.address.street, 'logradouro'],
      [!issuer?.address.district, 'bairro'],
      [!issuer?.address.cityCode, 'código IBGE da cidade'],
      [!issuer?.address.cityName, 'cidade'],
      [!issuer?.address.zipCode, 'CEP'],
      [!config.state, 'UF'],
      [!config.stateRegistration, 'inscrição estadual'],
    ] as ReadonlyArray<readonly [boolean, string]>
  )
    .filter(([absent]) => absent)
    .map(([, name]) => name);
  if (!issuer || missing.length > 0) {
    throw new BadRequestException(
      `Complete os Parâmetros da Empresa no Assistente de Configuração de NF-e antes do teste: ${missing.join(', ')}.`,
    );
  }
  return issuer;
};

const addressOf = (issuer: FiscalIssuer, state: string) => ({
  logradouro: issuer.address.street,
  numero: issuer.address.number || 'S/N',
  complemento: issuer.address.complement || undefined,
  bairro: issuer.address.district,
  codigoMunicipio: issuer.address.cityCode,
  municipio: issuer.address.cityName,
  uf: state,
  cep: issuer.address.zipCode,
});

/** Simples Nacional vai de CSOSN; regime normal, de CST com ICMS proprio. */
const icmsOf = (crt: FiscalCompanyConfig['crt'], base: number) =>
  crt === 2 || crt === 3
    ? {
        origem: 0,
        cst: '00',
        modalidadeBaseCalculo: 3,
        baseCalculo: base,
        aliquota: TEST_ICMS_RATE,
        valor: money((base * TEST_ICMS_RATE) / 100),
      }
    : { origem: 0, csosn: '102' };

const contributionOf = (cst: string, rate: number, base: number) => ({
  cst,
  baseCalculo: base,
  aliquota: rate,
  valor: money((base * rate) / 100),
});

/** Numero e serie entram depois, no NfeService, que controla a numeracao. */
export const buildHomologationNfePayload = (
  config: FiscalCompanyConfig,
): Record<string, unknown> => {
  const issuer = requireIssuer(config);
  const outbound = config.pisCofins?.outbound ?? PIS_COFINS_FALLBACK;
  const icms = icmsOf(config.crt, TEST_AMOUNT);
  const pis = contributionOf(outbound.cst, outbound.pisRate, TEST_AMOUNT);
  const cofins = contributionOf(outbound.cst, outbound.cofinsRate, TEST_AMOUNT);
  const address = addressOf(issuer, config.state);

  return {
    naturezaOperacao: config.nfe?.operationNature || 'VENDA DE MERCADORIA',
    tipoOperacao: 1,
    localDestino: 1,
    finalidade: 1,
    consumidorFinal: 1,
    presencaComprador: 1,
    emitente: {
      cnpj: issuer.document,
      razaoSocial: issuer.legalName,
      nomeFantasia: issuer.tradeName || undefined,
      inscricaoEstadual: config.stateRegistration,
      crt: config.crt,
      endereco: address,
    },
    destinatario: {
      cpf: TEST_CPF,
      nome: HOMOLOGATION_NAME,
      indicadorIE: 9,
      endereco: address,
    },
    itens: [
      {
        descricao: HOMOLOGATION_NAME,
        ncm: TEST_NCM,
        cfop: config.nfe?.cfopInState || '5102',
        unidade: 'UN',
        quantidade: 1,
        valorUnitario: TEST_AMOUNT,
        valorTotal: TEST_AMOUNT,
        impostos: { icms, pis, cofins },
      },
    ],
    totais: {
      baseCalculoICMS: icms.baseCalculo ?? 0,
      valorICMS: icms.valor ?? 0,
      valorProdutos: TEST_AMOUNT,
      valorPIS: pis.valor,
      valorCOFINS: cofins.valor,
      valorNota: TEST_AMOUNT,
    },
    pagamentos: [{ forma: 'dinheiro', valor: TEST_AMOUNT }],
  };
};
