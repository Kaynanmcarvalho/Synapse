import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UntrustedClaimsGuard } from './untrusted-claims.guard';

/** Contexto minimo: o guard so olha corpo, query e os metadados da rota. */
const contextOf = (request: { body?: unknown; query?: unknown }): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as unknown as ExecutionContext;

describe('UntrustedClaimsGuard', () => {
  let guard: UntrustedClaimsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    guard = new UntrustedClaimsGuard(reflector);
  });

  // §31: o teste que o cartao [F1] pede em c3-8.
  it('recusa role forjada no corpo', () => {
    const context = contextOf({ body: { name: 'Fulano', role: 'ADMIN_EMPRESA' } });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it.each([
    ['roleIds', { roleIds: ['SUPER_ADMIN_SAAS'] }],
    ['permissions', { permissions: ['vendas.excluir'] }],
    ['tenantId', { tenantId: 'outra-empresa' }],
    ['branchIds', { branchIds: ['filial-9'] }],
    ['warehouseIds', { warehouseIds: ['deposito-9'] }],
    ['mfaRequired', { mfaRequired: false }],
  ])('recusa %s no corpo', (_campo, body) => {
    expect(() => guard.canActivate(contextOf({ body }))).toThrow(ForbiddenException);
  });

  it('recusa o campo escondido no fundo do corpo', () => {
    const body = { pedido: { itens: [{ produto: { tenantId: 'outra-empresa' } }] } };
    expect(() => guard.canActivate(contextOf({ body }))).toThrow(ForbiddenException);
  });

  it('recusa independentemente de maiusculas e minusculas', () => {
    expect(() => guard.canActivate(contextOf({ body: { TenantId: 'x' } }))).toThrow(
      ForbiddenException,
    );
  });

  it('recusa o campo na query string', () => {
    expect(() => guard.canActivate(contextOf({ query: { tenantId: 'outra-empresa' } }))).toThrow(
      ForbiddenException,
    );
  });

  it('nomeia o campo recusado, para o cliente saber o que tirar', () => {
    expect(() => guard.canActivate(contextOf({ body: { roleIds: [] } }))).toThrow(
      /roleIds é derivado da sessão/,
    );
  });

  it('deixa passar o corpo que so tem dado de negocio', () => {
    const body = { nome: 'Ração 25kg', preco: 189.9, itens: [{ sku: 'RA-25', quantidade: 2 }] };
    expect(guard.canActivate(contextOf({ body }))).toBe(true);
  });

  it('deixa passar corpo e query vazios', () => {
    expect(guard.canActivate(contextOf({}))).toBe(true);
  });

  it('nao percorre o corpo para sempre quando ele se referencia', () => {
    const body: Record<string, unknown> = { nome: 'ok' };
    body.self = body;
    expect(guard.canActivate(contextOf({ body }))).toBe(true);
  });

  it('libera a rota marcada com AllowClaimInput', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = contextOf({ body: { permissions: ['vendas.criar'] } });
    expect(guard.canActivate(context)).toBe(true);
  });
});
