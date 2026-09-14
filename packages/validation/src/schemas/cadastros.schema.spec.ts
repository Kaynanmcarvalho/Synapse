import { describe, expect, it } from 'vitest';
import { fornecedorSchema } from './fornecedor.schema';
import { funcionarioSchema } from './funcionario.schema';
import { itemDeTabelaSchema } from './tabela.schema';

const caminhos = (resultado: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}) =>
  resultado.success ? [] : (resultado.error?.issues ?? []).map((issue) => issue.path.join('.'));

describe('itemDeTabelaSchema', () => {
  it('grava o nome em maiúsculas, como o Syndata', () => {
    expect(itemDeTabelaSchema.parse({ nome: '  praça norte ' })).toEqual({
      nome: 'PRAÇA NORTE',
      ativo: true,
    });
  });

  it('recusa nome vazio', () => {
    expect(itemDeTabelaSchema.safeParse({ nome: ' ' }).success).toBe(false);
  });
});

describe('fornecedorSchema', () => {
  const base = {
    tipoDePessoa: 'JURIDICA',
    documento: '11.222.333/0001-81',
    razaoSocial: 'Distribuidora Norte LTDA',
    inscricaoEstadual: '10.123.456-7',
    endereco: { cep: '74.230-020', uf: 'go', cidadeCodigoIbge: '5208707', cidade: 'GOIÂNIA' },
    telefone1: { numero: '(62) 3241-5566', whatsapp: true },
  };

  it('normaliza documento, CEP, UF e telefone, e completa o que falta com o padrão', () => {
    const fornecedor = fornecedorSchema.parse(base);
    expect(fornecedor.documento).toBe('11222333000181');
    expect(fornecedor.inscricaoEstadual).toBe('101234567');
    expect(fornecedor.endereco).toMatchObject({ cep: '74230020', uf: 'GO', paisCodigo: '1058' });
    expect(fornecedor.telefone1).toEqual({ numero: '6232415566', whatsapp: true });
    expect(fornecedor.telefone2).toBeNull();
    expect(fornecedor.nomeFantasia).toBe('Distribuidora Norte LTDA');
    expect(fornecedor.praca).toEqual({ codigo: 1, nome: 'GERAL' });
    expect(fornecedor.escrituracao.retencoes.iss).toBe(false);
  });

  it('confere o CNPJ da pessoa jurídica e o CPF da física', () => {
    expect(
      caminhos(fornecedorSchema.safeParse({ ...base, documento: '11222333000100' })),
    ).toContain('documento');
    expect(
      caminhos(
        fornecedorSchema.safeParse({
          ...base,
          tipoDePessoa: 'FISICA',
          documento: '11122233344',
          indicadorIe: 'NAO_CONTRIBUINTE',
        }),
      ),
    ).toContain('documento');
  });

  it('estrangeiro não precisa de CNPJ nem de inscrição estadual', () => {
    const fornecedor = fornecedorSchema.parse({
      tipoDePessoa: 'ESTRANGEIRA',
      documento: 'EIN 12-3456789',
      razaoSocial: 'Pet Foods Inc',
      endereco: { paisCodigo: '2496', paisNome: 'ESTADOS UNIDOS' },
    });
    expect(fornecedor.documento).toBe('EIN 12-3456789');
  });

  it('contribuinte de ICMS exige inscrição estadual', () => {
    expect(caminhos(fornecedorSchema.safeParse({ ...base, inscricaoEstadual: '' }))).toContain(
      'inscricaoEstadual',
    );
    expect(
      fornecedorSchema.safeParse({ ...base, inscricaoEstadual: 'isento', indicadorIe: 'ISENTO' })
        .success,
    ).toBe(true);
  });

  it('avisa e-mail inválido', () => {
    expect(caminhos(fornecedorSchema.safeParse({ ...base, emailNfe: 'nfe@' }))).toContain(
      'emailNfe',
    );
  });
});

describe('funcionarioSchema', () => {
  const base = { nome: 'Renier Pantoja', admissao: '2026-01-05' };

  it('exige nome e admissão, como o asterisco do Syndata', () => {
    expect(caminhos(funcionarioSchema.safeParse({}))).toEqual(
      expect.arrayContaining(['nome', 'admissao']),
    );
  });

  it('completa horários com segundos e normaliza documentos', () => {
    const funcionario = funcionarioSchema.parse({
      ...base,
      horaDeEntrada: '08:00',
      horaDeSaida: '18:00:00',
      documentos: { cpf: '529.982.247-25', categoriaDaCnh: 'ab' },
      outrasInformacoes: { tipoSanguineo: 'o+' },
    });
    expect(funcionario.horaDeEntrada).toBe('08:00:00');
    expect(funcionario.horaDeSaida).toBe('18:00:00');
    expect(funcionario.documentos.cpf).toBe('52998224725');
    expect(funcionario.documentos.categoriaDaCnh).toBe('AB');
    expect(funcionario.outrasInformacoes.tipoSanguineo).toBe('O+');
    expect(funcionario.cargo).toEqual({ codigo: 1, nome: 'GERAL' });
    expect(funcionario.comissao).toMatchObject({ vendedor: false, base: 'FATURAMENTO' });
  });

  it('recusa CPF inválido e hora fora do relógio', () => {
    const erros = caminhos(
      funcionarioSchema.safeParse({
        ...base,
        horaDeEntrada: '25:00',
        documentos: { cpf: '111.111.111-11' },
      }),
    );
    expect(erros).toEqual(expect.arrayContaining(['horaDeEntrada', 'documentos.cpf']));
  });

  it('recusa demissão antes da admissão', () => {
    expect(caminhos(funcionarioSchema.safeParse({ ...base, demissao: '2025-12-31' }))).toEqual([
      'demissao',
    ]);
  });

  it('percentual de comissão fica entre 0 e 100', () => {
    expect(
      caminhos(funcionarioSchema.safeParse({ ...base, comissao: { percentualAVista: 120 } })),
    ).toContain('comissao.percentualAVista');
  });
});
