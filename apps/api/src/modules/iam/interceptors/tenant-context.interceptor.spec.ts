import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { MembershipRepository } from '../repositories/membership.repository';
import { TenantContextInterceptor } from './tenant-context.interceptor';

const TENANT_DO_TOKEN = 'empresa-a';
const TENANT_ALHEIO = 'empresa-b';
const USUARIO = 'uid-1';

type Requisicao = { auth?: Record<string, unknown>; body?: unknown; tenant?: unknown };

const contextOf = (request: Requisicao): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as unknown as ExecutionContext;

const next: CallHandler = { handle: () => of(null) };

const tokenDe = (tenantId?: string, extras: Record<string, unknown> = {}) => ({
  uid: USUARIO,
  ...(tenantId ? { tenantId } : {}),
  ...extras,
});

describe('TenantContextInterceptor', () => {
  let db: FakeFirestore;
  let interceptor: TenantContextInterceptor;

  const semearVinculo = (tenantId: string, dados: Record<string, unknown> = {}) =>
    db.semear(`tenants/${tenantId}/users/${USUARIO}`, {
      authUid: USUARIO,
      status: 'active',
      roleIds: ['VENDEDOR'],
      branchIds: [],
      warehouseIds: [],
      mfaRequired: false,
      ...dados,
    });

  beforeEach(() => {
    db = new FakeFirestore();
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    interceptor = new TenantContextInterceptor(
      reflector,
      new MembershipRepository(db as unknown as Firestore),
    );
  });

  it('resolve o tenant a partir do token', async () => {
    semearVinculo(TENANT_DO_TOKEN);
    const request: Requisicao = { auth: tokenDe(TENANT_DO_TOKEN) };

    await interceptor.intercept(contextOf(request), next);

    expect(request.tenant).toEqual({
      tenantId: TENANT_DO_TOKEN,
      userId: USUARIO,
      roleIds: ['VENDEDOR'],
      branchIds: [],
      warehouseIds: [],
    });
  });

  // c4-6: o cartao pede exatamente este caso.
  it('recusa quando o token aponta para um tenant de que o usuario nao participa', async () => {
    semearVinculo(TENANT_DO_TOKEN);
    const request: Requisicao = { auth: tokenDe(TENANT_ALHEIO) };

    await expect(interceptor.intercept(contextOf(request), next)).rejects.toThrow(
      ForbiddenException,
    );
    expect(request.tenant).toBeUndefined();
  });

  // §62: trocar o tenant pelo corpo nao muda nada — quem manda e o token.
  it('ignora o tenantId enviado no corpo da requisicao', async () => {
    semearVinculo(TENANT_DO_TOKEN);
    const request: Requisicao = {
      auth: tokenDe(TENANT_DO_TOKEN),
      body: { tenantId: TENANT_ALHEIO },
    };

    await interceptor.intercept(contextOf(request), next);

    expect(request.tenant).toMatchObject({ tenantId: TENANT_DO_TOKEN });
    expect(db.caminhosTocados.some((path) => path.includes(TENANT_ALHEIO))).toBe(false);
  });

  it('recusa o token sem tenant ativo', async () => {
    const request: Requisicao = { auth: tokenDe(undefined) };
    await expect(interceptor.intercept(contextOf(request), next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('recusa a requisicao sem token nenhum', async () => {
    await expect(interceptor.intercept(contextOf({}), next)).rejects.toThrow(UnauthorizedException);
  });

  it('recusa o usuario bloqueado', async () => {
    semearVinculo(TENANT_DO_TOKEN, { status: 'blocked' });
    await expect(
      interceptor.intercept(contextOf({ auth: tokenDe(TENANT_DO_TOKEN) }), next),
    ).rejects.toThrow(ForbiddenException);
  });

  it('recusa quando o vinculo pertence a outro uid', async () => {
    semearVinculo(TENANT_DO_TOKEN, { authUid: 'outro-uid' });
    await expect(
      interceptor.intercept(contextOf({ auth: tokenDe(TENANT_DO_TOKEN) }), next),
    ).rejects.toThrow(ForbiddenException);
  });

  it('exige o segundo fator de quem tem MFA obrigatorio', async () => {
    semearVinculo(TENANT_DO_TOKEN, { mfaRequired: true });
    await expect(
      interceptor.intercept(contextOf({ auth: tokenDe(TENANT_DO_TOKEN) }), next),
    ).rejects.toThrow('MFA_REQUIRED');
  });

  it('aceita quem tem MFA obrigatorio e entrou com o segundo fator', async () => {
    semearVinculo(TENANT_DO_TOKEN, { mfaRequired: true });
    const request: Requisicao = {
      auth: tokenDe(TENANT_DO_TOKEN, { firebase: { sign_in_second_factor: 'totp' } }),
    };

    await interceptor.intercept(contextOf(request), next);

    expect(request.tenant).toMatchObject({ tenantId: TENANT_DO_TOKEN });
  });
});
