import type { Customer } from '@synapse/types';
import { clienteSchema } from '@synapse/validation';
import { describe, expect, it } from 'vitest';
import {
  escreverMoeda,
  formatarData,
  formatarDocumento,
  lerMoeda,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
} from './formato';
import { doCliente, FORMULARIO_VAZIO, paraEnvio, type FormularioDoCliente } from './formulario';
import { primeiraAbaComErro, validar } from './validacao';

const preenchido = (extra: Partial<FormularioDoCliente> = {}): FormularioDoCliente => ({
  ...FORMULARIO_VAZIO,
  tipo: 'PJ',
  documento: '11.222.333/0001-81',
  razaoSocial: 'Mercado do Bairro LTDA',
  nomeFantasia: 'Mercado do Bairro',
  cep: '74230-020',
  logradouro: 'Rua T-37',
  numero: '1450',
  bairro: 'Setor Bueno',
  cidade: 'Goiânia',
  uf: 'GO',
  telefone1: '(62) 3241-5566',
  limite: '15.000,00',
  ...extra,
});

describe('máscaras', () => {
  it('documento, CEP e telefone enquanto se digita', () => {
    expect(mascararDocumento('11222333000181')).toBe('11.222.333/0001-81');
    expect(mascararDocumento('52998224725')).toBe('529.982.247-25');
    expect(mascararCep('74230020')).toBe('74230-020');
    expect(mascararTelefone('6232415566')).toBe('(62) 3241-5566');
    expect(mascararTelefone('62998124455')).toBe('(62) 99812-4455');
  });

  it('documento incompleto fica como foi digitado', () => {
    expect(formatarDocumento('1122')).toBe('1122');
  });

  it('dinheiro vai e volta sem perder centavo', () => {
    expect(lerMoeda('15.000,50')).toBe(1_500_050);
    expect(lerMoeda('')).toBe(0);
    expect(escreverMoeda(1_500_050)).toBe('15.000,50');
  });

  it('data pura não recua um dia no fuso daqui', () => {
    expect(formatarData('2026-09-01')).toBe('01/09/2026');
  });
});

describe('formulário ↔ API', () => {
  it('o formulário preenchido passa no mesmo schema da API', () => {
    const corpo = paraEnvio(preenchido());
    const validado = clienteSchema.parse(corpo);
    expect(validado).toMatchObject({
      taxId: '11222333000181',
      name: 'Mercado do Bairro',
      legalName: 'Mercado do Bairro LTDA',
      creditLimit: 1_500_000,
      telefones: { principal: '6232415566', celular: null },
    });
    expect(validado.address.postalCode).toBe('74230020');
  });

  it('campo em branco vai como nulo, e não como texto vazio', () => {
    const corpo = paraEnvio(preenchido({ email: '  ', complemento: '' }));
    expect(corpo['email']).toBeNull();
    expect((corpo['address'] as { complement: unknown }).complement).toBeNull();
  });

  it('sem nome fantasia, o nome é a razão social', () => {
    expect(paraEnvio(preenchido({ nomeFantasia: '' }))['name']).toBe('Mercado do Bairro LTDA');
  });

  it('pessoa física não manda bloco de pessoa jurídica', () => {
    const corpo = paraEnvio(
      preenchido({ tipo: 'PF', documento: '529.982.247-25', socios: [{ nome: 'X', cpf: '' }] }),
    );
    expect(corpo['pessoaJuridica']).toBeNull();
  });

  it('TARE só vai quando marcado', () => {
    const sem = paraEnvio(preenchido({ numeroTare: 'TARE-1' }));
    expect((sem['pessoaJuridica'] as { tare: unknown }).tare).toBeNull();
    const com = paraEnvio(preenchido({ temTare: true, numeroTare: 'TARE-1' }));
    expect((com['pessoaJuridica'] as { tare: unknown }).tare).toEqual({
      numero: 'TARE-1',
      fomentarOuProduzir: false,
    });
  });

  it('referência sem empresa é descartada; com empresa vai limpa', () => {
    const corpo = paraEnvio(
      preenchido({
        referencias: [
          { empresa: '', contato: '', telefone: '', observacao: '' },
          {
            empresa: 'Distribuidora Norte',
            contato: '',
            telefone: '(62) 3333-0000',
            observacao: '',
          },
        ],
      }),
    );
    expect(corpo['referenciasComerciais']).toEqual([
      { empresa: 'Distribuidora Norte', contato: null, telefone: '6233330000', observacao: null },
    ]);
  });

  it('cliente gravado abre no formulário e volta igual', () => {
    const corpo = clienteSchema.parse(
      paraEnvio(
        preenchido({
          grupo: 'ATACADO',
          diasParaBloqueio: '5',
          autorizacaoDePagamento: 'SOMENTE_A_VISTA',
          socios: [{ nome: 'João da Silva', cpf: '529.982.247-25' }],
        }),
      ),
    );
    const gravado = {
      ...corpo,
      id: 'c1',
      tenantId: 't1',
      openCredit: 0,
      codigo: 'C-0001',
      createdAt: '2026-09-13T10:00:00.000Z',
      updatedAt: '2026-09-13T10:00:00.000Z',
      version: 1,
    } as unknown as Customer;
    const formulario = doCliente(gravado);
    expect(formulario).toMatchObject({
      documento: '11.222.333/0001-81',
      limite: '15.000,00',
      grupo: 'ATACADO',
      diasParaBloqueio: '5',
      autorizacaoDePagamento: 'SOMENTE_A_VISTA',
      telefone1: '(62) 3241-5566',
    });
    expect(clienteSchema.parse(paraEnvio(formulario))).toEqual(corpo);
  });

  it('cliente antigo, sem os campos novos, abre sem quebrar', () => {
    const antigo = {
      id: 'c1',
      type: 'PJ',
      taxId: '11222333000181',
      name: 'Mercado',
      legalName: null,
      address: {
        street: 'Rua',
        number: '1',
        district: 'Centro',
        city: 'Goiânia',
        state: 'GO',
        postalCode: '74000000',
      },
      phone: '6232415566',
      whatsapp: null,
      creditLimit: 0,
      financialStatus: 'REGULAR',
      active: true,
    } as unknown as Customer;
    const formulario = doCliente(antigo);
    expect(formulario.telefone1).toBe('(62) 3241-5566');
    expect(formulario.socios).toEqual([]);
    expect(formulario.autorizacaoDePagamento).toBe('SEM_RESTRICAO');
  });

  it('cliente antigo sem o campo "ativo" abre como ativo', () => {
    const semAtivo = {
      id: 'c2',
      type: 'PJ',
      taxId: '98765432000110',
      name: 'Padaria Estrela',
      address: {
        street: 'Av',
        number: '1',
        district: 'Centro',
        city: 'Goiânia',
        state: 'GO',
        postalCode: '74000000',
      },
      phone: '6232839090',
      creditLimit: 600_000,
    } as unknown as Customer;
    expect(doCliente(semAtivo)).toMatchObject({ ativo: true, situacao: 'REGULAR' });
  });
});

describe('validação na tela', () => {
  it('formulário completo não tem erro', () => {
    expect(validar(preenchido())).toEqual({});
  });

  it('o erro cai no campo da tela, e a aba certa abre', () => {
    const erros = validar(preenchido({ documento: '11.222.333/0001-99', cep: '742' }));
    expect(erros.documento).toBe('CNPJ inválido');
    expect(erros.cep).toBe('CEP inválido');
    expect(primeiraAbaComErro(erros)).toBe('principal');
  });

  it('erro na aba de pessoa jurídica aponta essa aba', () => {
    const erros = validar(preenchido({ temTare: true, numeroTare: '' }));
    expect(erros.numeroTare).toBeDefined();
    expect(primeiraAbaComErro(erros)).toBe('pessoa-juridica');
  });

  it('desconto fora de 0 a 100 aponta o controle de vendas', () => {
    const erros = validar(preenchido({ descontoMaximo: '150' }));
    expect(erros.descontoMaximo).toBeDefined();
    expect(primeiraAbaComErro(erros)).toBe('controle-de-vendas');
  });

  it('contribuinte sem IE avisa na inscrição estadual', () => {
    expect(validar(preenchido({ indicadorDeIe: 'CONTRIBUINTE' })).inscricaoEstadual).toBe(
      'Contribuinte de ICMS exige inscrição estadual',
    );
  });
});
