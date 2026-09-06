import { assertNonProductionTestTarget } from './production-target.guard';

describe('assertNonProductionTestTarget', () => {
  it('permite mock e homologação durante os testes', () => {
    expect(() => assertNonProductionTestTarget('fiscal', 'MOCK')).not.toThrow();
    expect(() => assertNonProductionTestTarget('bancária', 'HOMOLOGACAO')).not.toThrow();
  });

  it('bloqueia produção durante os testes', () => {
    expect(() => assertNonProductionTestTarget('fiscal', 'PRODUCAO')).toThrow(
      /produção é proibida em teste automatizado/,
    );
  });
});
