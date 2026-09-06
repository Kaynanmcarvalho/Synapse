import type { BankAccountConfig, SicrediConfig, ItauConfig } from '@synapse/types';
import { randomBytes } from 'node:crypto';
import { ContratoBancarioPendente } from '../providers/contrato-pendente';
import { ItauProvider } from '../providers/itau.provider';
import { MockBankProvider } from '../providers/mock-bank.provider';
import { SicrediProvider } from '../providers/sicredi.provider';
import { BankProviderRegistry, BANKING_VAULT } from './bank-provider.registry';

const SICREDI: SicrediConfig = {
  cooperativa: '0101',
  posto: '05',
  conta: '123456',
  carteira: '1',
  chavePix: 'pix@distribuidora.com.br',
  clientIdSecretRef: 'sicredi:clientId',
  clientSecretSecretRef: 'sicredi:clientSecret',
  certificadoSecretRef: 'sicredi:certificado',
};

const ITAU: ItauConfig = {
  agencia: '1234',
  conta: '567890',
  carteira: '109',
  chavePix: 'pix@distribuidora.com.br',
  clientIdSecretRef: 'itau:clientId',
  clientSecretSecretRef: 'itau:clientSecret',
  certificadoSecretRef: 'itau:certificado',
};

const conta = (extra: Partial<BankAccountConfig> = {}): BankAccountConfig => ({
  id: 'conta-1',
  bankId: 'SICREDI',
  environment: 'HOMOLOGACAO',
  apelido: 'Sicredi matriz',
  ativo: true,
  baseUrl: 'https://api-homologacao.exemplo',
  sicredi: SICREDI,
  ...extra,
});

describe('BankProviderRegistry', () => {
  let registry: BankProviderRegistry;

  beforeAll(() => {
    process.env.BANKING_MASTER_KEY = randomBytes(32).toString('base64');
  });

  beforeEach(() => {
    registry = new BankProviderRegistry(new MockBankProvider());
    for (const ref of [SICREDI, ITAU].flatMap((c) => [
      c.clientIdSecretRef,
      c.clientSecretSecretRef,
    ])) {
      BANKING_VAULT.store(ref, 'valor-secreto');
    }
    BANKING_VAULT.store(SICREDI.certificadoSecretRef, Buffer.from('PEM'));
    BANKING_VAULT.store(ITAU.certificadoSecretRef, Buffer.from('PEM'));
  });

  // c22-4: ambientes separados por banco.
  it('MOCK atende qualquer banco, sem precisar de credencial', () => {
    const provider = registry.resolve(conta({ environment: 'MOCK', baseUrl: null }));
    expect(provider).toBeInstanceOf(MockBankProvider);
  });

  it('resolve o Sicredi fora do MOCK', () => {
    const provider = registry.resolve(conta());
    expect(provider).toBeInstanceOf(SicrediProvider);
    expect(provider.bankId).toBe('SICREDI');
    expect(provider.environment).toBe('HOMOLOGACAO');
  });

  it('resolve o Itau no mesmo padrao', () => {
    const provider = registry.resolve(
      conta({ bankId: 'ITAU', sicredi: undefined, itau: ITAU, apelido: 'Itaú matriz' }),
    );
    expect(provider).toBeInstanceOf(ItauProvider);
    expect(provider.bankId).toBe('ITAU');
  });

  it('a mesma empresa pode estar em ambientes diferentes em cada banco', () => {
    const emProducao = registry.resolve(conta({ environment: 'PRODUCAO' }));
    const emHomologacao = registry.resolve(
      conta({ bankId: 'ITAU', sicredi: undefined, itau: ITAU, environment: 'HOMOLOGACAO' }),
    );

    expect(emProducao.environment).toBe('PRODUCAO');
    expect(emHomologacao.environment).toBe('HOMOLOGACAO');
  });

  it('recusa conta desativada', () => {
    expect(() => registry.resolve(conta({ ativo: false }))).toThrow(/desativada/);
  });

  // Nao inventamos endereco de banco: sem baseUrl a conta nao resolve.
  it('recusa ambiente real sem baseUrl, em vez de chutar o endereco', () => {
    expect(() => registry.resolve(conta({ baseUrl: null }))).toThrow(/baseUrl/);
  });

  it('recusa Sicredi sem a configuracao da secao 20', () => {
    expect(() => registry.resolve(conta({ sicredi: undefined }))).toThrow(/Sicredi ausente/);
  });

  // c22-6: banco previsto na interface, sem implementacao ainda, diz isso.
  it.each([['BANCO_DO_BRASIL'], ['BRADESCO'], ['SANTANDER'], ['SICOOB']] as const)(
    '%s ainda nao tem provider e o erro explica o que falta',
    (bankId) => {
      expect(() => registry.resolve(conta({ bankId, sicredi: undefined }))).toThrow(
        /ainda não tem implementação.*BANKING\.md/s,
      );
    },
  );
});

describe('SicrediProvider', () => {
  const credenciais = { clientId: 'id', clientSecret: 'segredo', certificado: Buffer.from('PEM') };
  const criar = (config: SicrediConfig) =>
    new SicrediProvider(config, credenciais, 'HOMOLOGACAO', 'https://exemplo');

  // c22-2: a configuracao da secao 20.
  it('monta o beneficiario com cooperativa, posto e conta', () => {
    expect(criar(SICREDI).beneficiario).toBe('0101/05/123456');
  });

  it('abre as credenciais do cofre antes de qualquer chamada', () => {
    expect(criar(SICREDI).credenciaisCompletas).toBe(true);
  });

  it.each([
    ['cooperativa'],
    ['posto'],
    ['conta'],
    ['carteira'],
    ['chavePix'],
    ['clientIdSecretRef'],
    ['certificadoSecretRef'],
  ] as const)('recusa configuracao sem %s, dizendo o campo', (campo) => {
    expect(() => criar({ ...SICREDI, [campo]: '' })).toThrow(new RegExp(campo));
  });

  it('recusa cooperativa e posto fora do formato', () => {
    expect(() => criar({ ...SICREDI, cooperativa: 'AB12' })).toThrow(/numérica/);
    expect(() => criar({ ...SICREDI, posto: '123' })).toThrow(/1 ou 2 dígitos/);
  });

  // c22-6: a chamada recusa na cara e diz qual documentacao resolve, em vez de
  // adivinhar caminho e nome de campo.
  it.each([
    ['createBoleto', () => criar(SICREDI).createBoleto({} as never)],
    ['cancelBoleto', () => criar(SICREDI).cancelBoleto('1')],
    ['getBoleto', () => criar(SICREDI).getBoleto('1')],
    ['createPixCharge', () => criar(SICREDI).createPixCharge({} as never)],
    ['getPixCharge', () => criar(SICREDI).getPixCharge('1')],
    ['getTransactions', () => criar(SICREDI).getTransactions({ de: '', ate: '' })],
    ['handleWebhook', () => criar(SICREDI).handleWebhook({} as never)],
  ])('%s diz o que falta em vez de chutar o contrato', async (operacao, chamar) => {
    // Rejeicao, e nao throw sincrono: quem chamar com .catch() precisa pegar.
    await expect(chamar()).rejects.toThrow(ContratoBancarioPendente);
    await expect(chamar()).rejects.toThrow(new RegExp(`SICREDI: ${operacao}`));
    await expect(chamar()).rejects.toThrow(/BANKING\.md/);
  });
});

describe('ItauProvider', () => {
  const credenciais = { clientId: 'id', clientSecret: 'segredo', certificado: Buffer.from('PEM') };

  it('monta o beneficiario com agencia e conta', () => {
    const provider = new ItauProvider(ITAU, credenciais, 'PRODUCAO', 'https://exemplo');
    expect(provider.beneficiario).toBe('1234/567890');
  });

  it('recusa agencia fora de quatro digitos', () => {
    expect(
      () => new ItauProvider({ ...ITAU, agencia: '12' }, credenciais, 'PRODUCAO', 'https://x'),
    ).toThrow(/4 dígitos/);
  });

  it('tambem recusa a operacao sem contrato', async () => {
    const provider = new ItauProvider(ITAU, credenciais, 'PRODUCAO', 'https://exemplo');
    await expect(provider.createBoleto({} as never)).rejects.toThrow(/ITAU: createBoleto/);
  });
});
