import { mensagemDeErroDaSessao, mensagemDeErroDeLogin } from './erros';

describe('mensagemDeErroDeLogin', () => {
  it.each([
    ['auth/invalid-credential'],
    ['auth/wrong-password'],
    ['auth/user-not-found'],
    ['auth/invalid-email'],
  ])('%s nao revela se o e-mail tem conta', (codigo) => {
    expect(mensagemDeErroDeLogin(codigo)).toBe('E-mail ou senha incorretos.');
  });

  it('explica bloqueio, excesso de tentativas e falta de rede', () => {
    expect(mensagemDeErroDeLogin('auth/user-disabled')).toMatch(/bloqueado/);
    expect(mensagemDeErroDeLogin('auth/too-many-requests')).toMatch(/Aguarde/);
    expect(mensagemDeErroDeLogin('auth/network-request-failed')).toMatch(/conexão/);
  });

  it('tem mensagem padrao para codigo desconhecido ou ausente', () => {
    expect(mensagemDeErroDeLogin('auth/algo-novo')).toBe('Não foi possível entrar. Tente de novo.');
    expect(mensagemDeErroDeLogin()).toBe('Não foi possível entrar. Tente de novo.');
  });
});

describe('mensagemDeErroDaSessao', () => {
  it('usuario sem empresa vinculada', () => {
    expect(mensagemDeErroDaSessao(401, 'Token sem tenant ativo')).toMatch(
      /vinculado a uma empresa/,
    );
  });

  it('empresa que exige segundo fator', () => {
    expect(mensagemDeErroDaSessao(403, 'MFA_REQUIRED')).toMatch(/duas etapas/);
  });

  it('usuario fora da empresa ou bloqueado nela', () => {
    expect(mensagemDeErroDaSessao(403, 'Usuário não pertence ao tenant ativo')).toMatch(
      /não tem acesso/,
    );
  });

  it('falha do servidor nao vira culpa do usuario', () => {
    expect(mensagemDeErroDaSessao(503)).toMatch(/servidor do Synapse/);
  });

  it('repassa a mensagem da API nos demais casos', () => {
    expect(mensagemDeErroDaSessao(400, 'deviceId: muito curto')).toBe('deviceId: muito curto');
  });
});
