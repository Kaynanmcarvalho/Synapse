import type { FiscalCompanyConfig } from '@synapse/types';
import { buildHomologationNfePayload, HOMOLOGATION_NAME } from './homologation-nfe.payload';

const config = (partial: Partial<FiscalCompanyConfig> = {}): FiscalCompanyConfig => ({
  companyId: 'tenant-dev',
  environment: 'HOMOLOGACAO',
  provider: 'GYN_FISCAL',
  crt: 3,
  stateRegistration: '108052079',
  cscId: null,
  cscSecretRef: null,
  nfeSeries: 1,
  nfceSeries: 1,
  state: 'GO',
  taxRegime: 'Regime Normal',
  certificateSecretRef: 'ref-a1',
  certificatePasswordSecretRef: 'ref-a1-senha',
  providerApiKeySecretRef: 'ref-chave',
  providerTenantIdSecretRef: 'ref-tenant',
  issuer: {
    personType: 'PJ',
    document: '38242542000143',
    legalName: 'RP DISTRIBUIDORA DE PRODUTOS AGROPECUARIOS LTDA',
    tradeName: 'REDE PET',
    municipalRegistration: '',
    suframaRegistration: '',
    address: {
      zipCode: '74946630',
      street: 'RUA DAS MATAS',
      number: 'S/N',
      complement: 'QD 09 LT 18 GALPAO01',
      district: 'RESIDENCIAL NORTE SUL',
      cityCode: '5201405',
      cityName: 'APARECIDA DE GOIANIA',
      countryCode: '1058',
    },
    phone: '6232893432',
    phone2: '',
    fax: '',
    email: '',
    responsible: 'ANGELICA',
    cnae: '',
    accountantDocument: '',
    accountantName: '',
  },
  ...partial,
});

type Bloco = Record<string, unknown>;
const bloco = (payload: Record<string, unknown>, chave: string) => payload[chave] as Bloco;

describe('buildHomologationNfePayload', () => {
  it('monta a NF-e de teste com os dados do assistente', () => {
    const payload = buildHomologationNfePayload(config());
    const emitente = bloco(payload, 'emitente');
    const destinatario = bloco(payload, 'destinatario');
    const item = (payload.itens as Bloco[])[0] as Bloco;

    expect(emitente.cnpj).toBe('38242542000143');
    expect(emitente.inscricaoEstadual).toBe('108052079');
    expect((emitente.endereco as Bloco).codigoMunicipio).toBe('5201405');
    expect((emitente.endereco as Bloco).uf).toBe('GO');
    expect(destinatario.nome).toBe(HOMOLOGATION_NAME);
    expect(destinatario.indicadorIE).toBe(9);
    expect(item.descricao).toBe(HOMOLOGATION_NAME);
    expect(item.cfop).toBe('5102');
    expect(payload.pagamentos).toEqual([{ forma: 'dinheiro', valor: 1 }]);
  });

  it('regime normal vai de CST e Simples Nacional de CSOSN', () => {
    const normal = buildHomologationNfePayload(config({ crt: 3 }));
    const simples = buildHomologationNfePayload(config({ crt: 1 }));
    const icms = (payload: Record<string, unknown>) =>
      (((payload.itens as Bloco[])[0] as Bloco).impostos as Bloco).icms as Bloco;

    expect(icms(normal).cst).toBe('00');
    expect(icms(normal).valor).toBe(0.18);
    expect(bloco(normal, 'totais').valorICMS).toBe(0.18);
    expect(icms(simples).csosn).toBe('102');
    expect(icms(simples).cst).toBeUndefined();
    expect(bloco(simples, 'totais').valorICMS).toBe(0);
  });

  it('usa o CFOP e o PIS/COFINS salvos no assistente', () => {
    const payload = buildHomologationNfePayload(
      config({
        nfe: {
          cfopInState: '5405',
          cfopOutOfState: '6102',
          operationNature: 'VENDA DE RACAO',
          nextNumber: 3159,
          danfeOrientation: 'PORTRAIT',
          additionalInfo: '',
          emissionMode: 'NORMAL',
        },
        pisCofins: {
          outbound: {
            cst: '07',
            baseReductionPercent: 0,
            pisRate: 0,
            cofinsRate: 0,
            revenueNature: '',
          },
          inbound: {
            cst: '50',
            baseReductionPercent: 0,
            pisRate: 1.65,
            cofinsRate: 7.6,
            revenueNature: '',
          },
        },
      }),
    );
    const impostos = ((payload.itens as Bloco[])[0] as Bloco).impostos as Bloco;

    expect(payload.naturezaOperacao).toBe('VENDA DE RACAO');
    expect(((payload.itens as Bloco[])[0] as Bloco).cfop).toBe('5405');
    expect((impostos.pis as Bloco).cst).toBe('07');
    expect((impostos.pis as Bloco).valor).toBe(0);
    expect(bloco(payload, 'totais').valorCOFINS).toBe(0);
  });

  it('sem os Parâmetros da Empresa, diz o que falta preencher', () => {
    expect(() => buildHomologationNfePayload(config({ issuer: null }))).toThrow(
      /Complete os Parâmetros da Empresa.*CNPJ/s,
    );
  });
});
