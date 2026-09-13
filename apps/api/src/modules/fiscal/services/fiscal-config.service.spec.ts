import { randomBytes } from 'node:crypto';
import { fiscalConfigSchema, type FiscalConfigInput } from '../dto/fiscal.schemas';
import { FiscalRepository } from '../repositories/fiscal.repository';
import { FiscalConfigService } from './fiscal-config.service';
import { SecretVaultService } from './secret-vault.service';

const base: FiscalConfigInput = fiscalConfigSchema.parse({
  companyId: 'tenant-1',
  environment: 'HOMOLOGACAO',
  provider: 'MOCK',
  crt: 3,
  stateRegistration: '108052079',
  nfeSeries: 1,
  nfceSeries: 2,
  state: 'go',
  taxRegime: 'Regime Normal',
});

const nfe = {
  cfopInState: '5102',
  cfopOutOfState: '6102',
  operationNature: 'VENDA',
  nextNumber: 3159,
  danfeOrientation: 'PORTRAIT',
  additionalInfo: '',
  emissionMode: 'NORMAL',
} as const;

describe('FiscalConfigService — assistente de NF-e', () => {
  let service: FiscalConfigService;

  beforeEach(() => {
    process.env.FISCAL_MASTER_KEY = randomBytes(32).toString('base64');
    service = new FiscalConfigService(new FiscalRepository(), new SecretVaultService());
  });
  afterEach(() => {
    delete process.env.FISCAL_MASTER_KEY;
  });

  it('guarda os blocos do assistente e mantém o salvo quando um bloco não é enviado', () => {
    service.save({ ...base, nfe });
    const saved = service.save({ ...base, nfeSeries: 3 });
    expect(saved.nfe).toEqual(nfe);
    expect(saved.nfeSeries).toBe(3);
    expect(saved.state).toBe('GO');
    expect(saved.updatedAt).toEqual(expect.any(String));
  });

  it('senha do SMTP e da contingência viram referência, nunca valor', () => {
    const saved = service.save({ ...base, smtpPassword: 'smtp-123', nfceOfflinePassword: '9876' });
    expect(saved.smtpPasswordSecretRef).toEqual(expect.any(String));
    expect(saved.nfceOfflinePasswordSecretRef).toEqual(expect.any(String));
    expect(JSON.stringify(saved)).not.toContain('smtp-123');
    expect(JSON.stringify(saved)).not.toContain('9876');
    const again = service.save(base);
    expect(again.smtpPasswordSecretRef).toBe(saved.smtpPasswordSecretRef);
  });

  it('recusa CNPJ do emitente e CFOP malformados', () => {
    const issuer = {
      personType: 'PJ',
      document: '38242542000144',
      legalName: 'RP DISTRIBUIDORA',
      tradeName: 'REDE PET',
      municipalRegistration: '',
      suframaRegistration: '',
      address: {
        zipCode: '74946630',
        street: 'RUA DAS MATAS',
        number: 'S/N',
        complement: '',
        district: 'RESIDENCIAL NORTE SUL',
        cityCode: '5201405',
        cityName: 'APARECIDA DE GOIANIA',
        countryCode: '1058',
      },
      phone: '',
      phone2: '',
      fax: '',
      email: '',
      responsible: '',
      cnae: '',
      accountantDocument: '',
      accountantName: '',
    };
    expect(fiscalConfigSchema.safeParse({ ...base, issuer }).success).toBe(false);
    expect(
      fiscalConfigSchema.safeParse({ ...base, nfe: { ...nfe, cfopInState: '6102' } }).success,
    ).toBe(false);
    expect(fiscalConfigSchema.safeParse({ ...base, nfe }).success).toBe(true);
  });
});
