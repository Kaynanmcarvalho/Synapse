import type { FiscalCompanyConfig } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import {
  aplicarMascara,
  formatarCfop,
  formatarCnpj,
  formatarTelefone,
  lerDecimal,
} from './assistente.formato';
import { deConfig, formularioPadrao, segredosGravados, segredosVazios } from './assistente.padrao';
import { paraPayload } from './assistente.payload';
import { listarPendencias } from './assistente.pendencias';
import type { FormularioFiscal } from './assistente.tipos';

/** Config gravada antes de existir o assistente: sem os blocos novos. */
const CONFIG_ANTIGA: FiscalCompanyConfig = {
  companyId: 'tenant-dev',
  environment: 'PRODUCAO',
  provider: 'GYN_FISCAL',
  crt: 1,
  stateRegistration: '108052079',
  cscId: '000001',
  cscSecretRef: 'ref-csc',
  nfeSeries: 3,
  nfceSeries: 2,
  state: 'GO',
  taxRegime: 'Simples Nacional',
  certificateSecretRef: 'ref-a1',
  certificatePasswordSecretRef: 'ref-a1-senha',
  providerApiKeySecretRef: null,
  providerTenantIdSecretRef: null,
};

const comEmpresa = (parcial: Partial<FormularioFiscal> = {}): FormularioFiscal => {
  const padrao = formularioPadrao();
  return { ...padrao, stateRegistration: 'ISENTO', state: 'GO', ...parcial };
};

describe('máscaras do assistente', () => {
  it('formata conforme a pessoa digita', () => {
    expect(formatarCnpj('38242542')).toBe('38.242.542');
    expect(formatarCnpj('38242542000143')).toBe('38.242.542/0001-43');
    expect(formatarTelefone('6232893432')).toBe('(62) 3289-3432');
    expect(formatarTelefone('62998251480')).toBe('(62) 99825-1480');
    expect(formatarCfop('5102')).toBe('5.102');
    expect(aplicarMascara('abc', '00-00')).toBe('');
  });

  it('lê alíquota com vírgula', () => {
    expect(lerDecimal('1,65')).toBe(1.65);
    expect(lerDecimal('7,6000')).toBe(7.6);
    expect(lerDecimal('')).toBe(0);
  });
});

describe('ida e volta com a API', () => {
  it('config antiga ganha os blocos padrão sem perder o que existia', () => {
    const formulario = deConfig(CONFIG_ANTIGA);
    expect(formulario.nfeSeries).toBe(3);
    expect(formulario.cscId).toBe('000001');
    expect(formulario.nfe.cfopInState).toBe('5102');
    expect(formulario.issuer.address.countryCode).toBe('1058');
    expect(segredosGravados(CONFIG_ANTIGA)).toMatchObject({
      certificado: true,
      csc: true,
      chaveProvedor: false,
    });
  });

  it('manda só os segredos digitados e confirma produção', () => {
    const payload = paraPayload('tenant-dev', deConfig(CONFIG_ANTIGA), {
      ...segredosVazios(),
      csc: 'novo-csc',
    });
    expect(payload.csc).toBe('novo-csc');
    expect('certificatePassword' in payload).toBe(false);
    expect('certificateFileName' in payload).toBe(false);
    expect(payload.productionConfirmation).toBe('ATIVAR PRODUCAO');
    expect(payload.taxRegime).toBe('Simples Nacional');
  });

  it('série da NFC-e: primeira linha do controle, ou a já gravada quando não há linhas', () => {
    expect(paraPayload('t', deConfig(CONFIG_ANTIGA), segredosVazios()).nfceSeries).toBe(2);
    const padrao = formularioPadrao();
    const linha = {
      id: 'a',
      identifier: 'web-erp-1',
      system: 'PDV',
      name: 'Caixa 1',
      series: 5,
      nextNumber: 240,
    } as const;
    const comLinha = { ...padrao, nfce: { ...padrao.nfce, series: [linha] } };
    expect(paraPayload('t', comLinha, segredosVazios()).nfceSeries).toBe(5);
    expect(paraPayload('t', padrao, segredosVazios()).productionConfirmation).toBeUndefined();
  });
});

describe('pendências', () => {
  const pendencias = (formulario: FormularioFiscal) =>
    listarPendencias(formulario, segredosVazios(), segredosGravados(null));

  it('CNPJ inválido impede salvar; certificado ausente só avisa', () => {
    const padrao = formularioPadrao();
    const lista = pendencias(
      comEmpresa({ issuer: { ...padrao.issuer, document: '38242542000144' } }),
    );
    expect(lista.find((p) => p.mensagem.startsWith('CNPJ do emitente'))?.bloqueia).toBe(true);
    expect(lista.find((p) => p.aba === 'certificado')?.bloqueia).toBe(false);
  });

  it('sem inscrição estadual ou UF a API recusaria', () => {
    const bloqueios = pendencias(formularioPadrao())
      .filter((p) => p.bloqueia)
      .map((p) => p.mensagem);
    expect(bloqueios).toEqual(['Informe a inscrição estadual (ou ISENTO).', 'Selecione a UF.']);
  });

  it('CFOP dentro do estado começa com 5 e produção exige o Gyn Fiscal', () => {
    const padrao = formularioPadrao();
    const lista = pendencias(
      comEmpresa({
        environment: 'PRODUCAO',
        provider: 'MOCK',
        nfe: { ...padrao.nfe, cfopInState: '6102' },
      }),
    );
    expect(lista.filter((p) => p.bloqueia).map((p) => p.etapa)).toEqual(['nota-fiscal', 'nfe']);
  });
});
