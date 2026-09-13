import { describe, expect, it } from 'vitest';
import { clienteSchema } from './cliente.schema';

const base = {
  type: 'PJ' as const,
  taxId: '11.222.333/0001-81',
  name: 'Mercado do Bairro',
  legalName: 'Mercado do Bairro Comércio de Alimentos LTDA',
  address: {
    street: 'Rua T-37',
    number: '1450',
    district: 'Setor Bueno',
    city: 'Goiânia',
    state: 'go',
    postalCode: '74.230-020',
  },
  telefones: { principal: '(62) 3241-5566' },
  creditLimit: 1_500_000,
};

const valido = (extra: Record<string, unknown> = {}) => clienteSchema.parse({ ...base, ...extra });
const erroEm = (extra: Record<string, unknown>) => {
  const resultado = clienteSchema.safeParse({ ...base, ...extra });
  return resultado.success ? null : resultado.error.issues.map((i) => i.path.join('.'));
};

describe('clienteSchema', () => {
  it('normaliza documento, UF e CEP', () => {
    const cliente = valido();
    expect(cliente.taxId).toBe('11222333000181');
    expect(cliente.address.state).toBe('GO');
    expect(cliente.address.postalCode).toBe('74230020');
  });

  it('telefone vira só dígitos, e phone/whatsapp saem derivados', () => {
    const cliente = valido({
      telefones: {
        principal: '(62) 3241-5566',
        celular: '(62) 99812-4455',
        whatsapp: '62998124455',
      },
    });
    expect(cliente.telefones).toMatchObject({
      principal: '6232415566',
      celular: '62998124455',
      whatsapp: '62998124455',
      secundario: null,
    });
    expect(cliente.phone).toBe('6232415566');
    expect(cliente.whatsapp).toBe('62998124455');
  });

  it('aceita o corpo antigo, com o telefone solto', () => {
    const { telefones: _fora, ...semTelefones } = base;
    const cliente = clienteSchema.parse({ ...semTelefones, phone: '6232415566', whatsapp: null });
    expect(cliente.telefones.principal).toBe('6232415566');
    expect(cliente.telefones.celular).toBeNull();
  });

  it('sem telefone nenhum, recusa', () => {
    const { telefones: _fora, ...semTelefones } = base;
    expect(clienteSchema.safeParse(semTelefones).success).toBe(false);
  });

  it('CNPJ inválido é recusado', () => {
    expect(erroEm({ taxId: '11222333000199' })).toContain('taxId');
  });

  it('o aviso do documento aparece mesmo com o resto em branco', () => {
    const resultado = clienteSchema.safeParse({ type: 'PJ', taxId: '', address: {} });
    const doDocumento = resultado.success
      ? []
      : resultado.error.issues.filter((i) => i.path[0] === 'taxId').map((i) => i.message);
    expect(doDocumento).toEqual(['Informe o CPF ou o CNPJ']);
  });

  it('a mensagem diz o que está errado no documento', () => {
    const mensagem = (taxId: string, type = 'PJ') => {
      const resultado = clienteSchema.safeParse({ ...base, type, taxId });
      return resultado.success
        ? null
        : resultado.error.issues.find((i) => i.path[0] === 'taxId')?.message;
    };
    expect(mensagem('11222333000199')).toBe('CNPJ inválido');
    expect(mensagem('52998224700', 'PF')).toBe('CPF inválido');
    expect(mensagem('1234')).toBe('CPF tem 11 dígitos e CNPJ, 14');
    expect(mensagem('52998224725')).toBe('Pessoa jurídica e produtor rural usam CNPJ');
    expect(mensagem('11222333000181', 'PF')).toBe('Pessoa física usa CPF');
  });

  it('CPF vale para pessoa física, e CNPJ não', () => {
    expect(clienteSchema.safeParse({ ...base, type: 'PF', taxId: '529.982.247-25' }).success).toBe(
      true,
    );
    expect(erroEm({ type: 'PF' })).toContain('taxId');
  });

  it('contribuinte de ICMS exige inscrição estadual', () => {
    expect(erroEm({ indicadorDeIe: 'CONTRIBUINTE' })).toContain('stateRegistration');
    expect(
      valido({ indicadorDeIe: 'CONTRIBUINTE', stateRegistration: '10.123.456-7' })
        .stateRegistration,
    ).toBe('101234567');
  });

  it('produtor rural exige inscrição estadual', () => {
    expect(erroEm({ type: 'RURAL_PRODUCER' })).toContain('stateRegistration');
  });

  it('campos de texto vazios viram nulo, e não string vazia', () => {
    const cliente = valido({ email: '', legalName: '', municipalRegistration: '  ' });
    expect(cliente.email).toBeNull();
    expect(cliente.legalName).toBeNull();
    expect(cliente.municipalRegistration).toBeNull();
  });

  it('e-mail torto é recusado, inclusive o da NF-e', () => {
    expect(erroEm({ emailNfe: 'nao-e-email' })).toContain('emailNfe');
  });

  it('pessoa jurídica: sócios, contabilista e TARE', () => {
    const cliente = valido({
      pessoaJuridica: {
        contato: { nome: 'Ana Compras', celular: '62999990000' },
        socios: [{ nome: 'João da Silva', cpf: '529.982.247-25' }],
        contabilista: 'Contabilidade Central',
        dataDeAbertura: '2019-03-14',
        ramoDeAtividade: 'Supermercado',
        segmento: 'Varejo alimentar',
        revendedor: true,
        inscricaoSuframa: '123456',
        tare: { numero: 'TARE-9988', fomentarOuProduzir: true },
      },
    });
    expect(cliente.pessoaJuridica?.socios[0]).toEqual({
      nome: 'João da Silva',
      cpf: '52998224725',
    });
    expect(cliente.pessoaJuridica?.tare?.numero).toBe('TARE-9988');
    expect(cliente.pessoaJuridica?.substitutoTributario).toBe(false);
  });

  it('CPF de sócio inválido é recusado', () => {
    const caminhos = erroEm({
      pessoaJuridica: { socios: [{ nome: 'João da Silva', cpf: '11111111111' }] },
    });
    expect(caminhos?.join(' ')).toContain('cpf');
  });

  it('data de abertura fora do formato é recusada', () => {
    expect(erroEm({ pessoaJuridica: { dataDeAbertura: '14/03/2019' } })?.join(' ')).toContain(
      'dataDeAbertura',
    );
  });

  it('controle de vendas tem padrão e limites', () => {
    expect(valido().controleDeVendas).toEqual({
      condicaoDePagamentoPadrao: null,
      formaDePagamentoPadrao: null,
      descontoMaximoPercentual: null,
      diasParaBloqueio: null,
      autorizacaoDePagamento: 'SEM_RESTRICAO',
    });
    expect(erroEm({ controleDeVendas: { descontoMaximoPercentual: 140 } })?.join(' ')).toContain(
      'descontoMaximoPercentual',
    );
    expect(erroEm({ controleDeVendas: { diasParaBloqueio: -1 } })?.join(' ')).toContain(
      'diasParaBloqueio',
    );
  });

  it('referências comerciais exigem a empresa', () => {
    expect(
      valido({
        referenciasComerciais: [{ empresa: 'Distribuidora Norte', telefone: '6233330000' }],
      }).referenciasComerciais[0],
    ).toMatchObject({ empresa: 'Distribuidora Norte', telefone: '6233330000', contato: null });
    expect(erroEm({ referenciasComerciais: [{ empresa: '' }] })?.join(' ')).toContain('empresa');
  });

  it('situação só aceita o que a tela decide; OVERDUE é do sistema', () => {
    expect(valido({ financialStatus: 'BLOCKED' }).financialStatus).toBe('BLOCKED');
    expect(erroEm({ financialStatus: 'OVERDUE' })).toContain('financialStatus');
  });

  it('limite negativo é recusado', () => {
    expect(erroEm({ creditLimit: -1 })).toContain('creditLimit');
  });
});
