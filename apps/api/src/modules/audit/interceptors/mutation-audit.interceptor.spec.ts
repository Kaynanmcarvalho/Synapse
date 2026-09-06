import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { AuditRepository } from '../repositories/audit.repository';
import { MutationAuditInterceptor } from './mutation-audit.interceptor';

describe('MutationAuditInterceptor', () => {
  it('captura antes, depois, usuário, IP e dispositivo automaticamente', async () => {
    const appended: unknown[] = [];
    const audits = {
      snapshot: async () => ({ price: 120 }),
      append: async (log: unknown) => {
        appended.push(log);
      },
    } as unknown as AuditRepository;
    const reflector = {
      getAllAndOverride: () => ({ domain: 'PRICE', entity: 'Product', collection: 'products' }),
    } as unknown as Reflector;
    const request = {
      method: 'PATCH',
      params: { id: 'product-1' },
      tenant: { tenantId: 'tenant', userId: 'user' },
      ip: '127.0.0.1',
      socket: {},
      headers: { 'user-agent': 'PDV-01', 'x-correlation-id': 'trace-1' },
    };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const interceptor = new MutationAuditInterceptor(reflector, audits);
    await lastValueFrom(
      await interceptor.intercept(context, {
        handle: () => of({ id: 'product-1', price: 135 }),
      } as CallHandler),
    );
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({
      userId: 'user',
      ip: '127.0.0.1',
      device: 'PDV-01',
      before: { price: 120 },
      after: { id: 'product-1', price: 135 },
    });
  });
});
