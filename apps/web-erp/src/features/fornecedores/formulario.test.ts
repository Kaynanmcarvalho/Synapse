import type { ConsultaDeCnpj } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { definirCaminho } from '../cadastros/comum/caminho';
import {
  doFuncionario,
  funcionarioVazio,
  paraEnvio as funcionarioParaEnvio,
  validarFuncionario,
} from '../funcionarios/formulario';
import { comConsulta, fornecedorVazio, validarFornecedor } from './formulario';

describe('ficha do fornecedor', () => {
  it('nova ficha recusa CNPJ vazio e aponta o campo', () => {
    const validacao = validarFornecedor({ ...fornecedorVazio(), razaoSocial: 'Norte' });
    expect(validacao.ok).toBe(false);
    if (!validacao.ok) expect(validacao.erros['documento']).toBe('Informe o CNPJ');
  });

  it('com CNPJ, IE e regime vazio, manda regime nulo e prazo em número', () => {
    const validacao = validarFornecedor({
      ...fornecedorVazio(),
      documento: '11.222.333/0001-81',
      razaoSocial: 'DISTRIBUIDORA NORTE',
      inscricaoEstadual: '101234567',
      prazoMedioDeEntregaDias: '7',
    });
    expect(validacao.ok).toBe(true);
    if (validacao.ok)
      expect(validacao.corpo).toMatchObject({ regimeTributario: null, prazoMedioDeEntregaDias: 7 });
  });

  it('a consulta do CNPJ preenche sem apagar o que ela não traz', () => {
    const consulta: ConsultaDeCnpj = {
      cnpj: '11222333000181',
      razaoSocial: 'Distribuidora Norte Ltda',
      nomeFantasia: '',
      situacao: 'ATIVA',
      abertura: '2015-03-10',
      atividadePrincipal: null,
      endereco: {
        cep: '74230020',
        logradouro: 'Rua T-37',
        numero: '1450',
        complemento: null,
        bairro: 'Setor Bueno',
        cidadeCodigoIbge: '5208707',
        cidade: 'GOIÂNIA',
        uf: 'GO',
        paisCodigo: '1058',
        paisNome: 'BRASIL',
      },
      telefone: '6232415566',
      email: null,
      simplesNacional: true,
      fonte: 'BrasilAPI',
    };
    const antes = {
      ...fornecedorVazio(),
      email: 'compras@norte.com.br',
      inscricaoEstadual: '101234567',
    };
    const depois = comConsulta(antes, consulta);
    expect(depois).toMatchObject({
      razaoSocial: 'DISTRIBUIDORA NORTE LTDA',
      nomeFantasia: 'DISTRIBUIDORA NORTE LTDA',
      email: 'compras@norte.com.br',
      inscricaoEstadual: '101234567',
      regimeTributario: 'SIMPLES_NACIONAL',
      telefone1: { numero: '6232415566', whatsapp: false },
      endereco: { logradouro: 'RUA T-37', cidadeCodigoIbge: '5208707', uf: 'GO' },
    });
  });
});

describe('ficha do funcionário', () => {
  it('converte salário, meta e percentuais digitados', () => {
    let formulario = funcionarioVazio();
    formulario = definirCaminho(formulario, 'nome', 'RENIER PANTOJA');
    formulario = definirCaminho(formulario, 'salario', '2.350,50');
    formulario = definirCaminho(formulario, 'comissao.percentualAVista', '2,5');
    formulario = definirCaminho(formulario, 'comissao.metaMensal', '50.000');
    expect(funcionarioParaEnvio(formulario)).toMatchObject({
      salarioCentavos: 235_050,
      comissao: { percentualAVista: 2.5, metaMensalCentavos: 5_000_000 },
    });
    expect(validarFuncionario(formulario).ok).toBe(true);
  });

  it('o aviso do salário aparece no campo da tela, não no do schema', () => {
    const formulario = definirCaminho(funcionarioVazio(), 'comissao.percentualAPrazo', '150');
    const validacao = validarFuncionario(definirCaminho(formulario, 'nome', 'X Y'));
    expect(validacao.ok).toBe(false);
    if (!validacao.ok) expect(validacao.erros['comissao.percentualAPrazo']).toBeTruthy();
  });

  it('ida e volta da ficha gravada', () => {
    const formulario = doFuncionario({
      id: 'f1',
      tenantId: 't' as never,
      codigo: 15,
      matricula: null,
      nome: 'RENIER PANTOJA',
      bloqueado: false,
      endereco: { cep: '', logradouro: '', bairro: '', cidadeCodigoIbge: null, cidade: '', uf: '' },
      telefone: null,
      celular: '62998124455',
      cargo: { codigo: 2, nome: 'VENDEDOR' },
      praca: { codigo: 1, nome: 'GERAL' },
      departamento: { codigo: 1, nome: 'GERAL' },
      horaDeEntrada: '08:00:00',
      horaDeSaida: null,
      admissao: '2026-01-05',
      demissao: null,
      salarioCentavos: 235_050,
      outrasInformacoes: {
        nascimento: null,
        sexo: 'MASCULINO',
        tipoSanguineo: null,
        escolaridade: null,
        email: null,
        pai: null,
        mae: null,
        estadoCivil: 'NAO_INFORMADO',
        conjuge: null,
        observacoes: null,
      },
      documentos: {
        identidade: null,
        cpf: '52998224725',
        pis: null,
        tituloDeEleitor: null,
        ctps: null,
        serieDaCtps: null,
        cnh: null,
        categoriaDaCnh: null,
      },
      comissao: {
        vendedor: true,
        percentualAVista: 2.5,
        percentualAPrazo: 3,
        base: 'FATURAMENTO',
        descontoMaximoPercentual: 5,
        metaMensalCentavos: 5_000_000,
      },
      usuario: null,
      fotoAtualizadaEm: null,
      createdAt: '',
      createdBy: {} as never,
      updatedAt: '',
      updatedBy: {} as never,
      version: 1,
    });
    expect(formulario).toMatchObject({
      salario: '2.350,50',
      comissao: { percentualAVista: '2,5', metaMensal: '50.000,00' },
    });
    expect(funcionarioParaEnvio(formulario)).toMatchObject({
      salarioCentavos: 235_050,
      comissao: { metaMensalCentavos: 5_000_000 },
    });
  });
});
