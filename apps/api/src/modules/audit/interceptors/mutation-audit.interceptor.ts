import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuditLog } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../../iam/iam.types';
import { AUDIT_METADATA, type AuditMetadata } from '../audit.decorator';
import { AuditRepository } from '../repositories/audit.repository';

@Injectable()
export class MutationAuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audits: AuditRepository,
  ) {}
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod(context)))
      return next.handle();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenant = request.tenant;
    const id = request.params?.['id'] as string | undefined;
    if (!tenant) return next.handle();
    const before = await this.audits.snapshot(tenant.tenantId, metadata.collection, id);
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        const log: AuditLog = {
          id: randomUUID(),
          tenantId: tenant.tenantId,
          userId: tenant.userId,
          ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
          device: request.headers['user-agent'] ?? 'unknown',
          operation: request.method,
          domain: metadata.domain,
          entity: metadata.entity,
          entityId: id ?? this.readId(result),
          before,
          after: this.record(result),
          occurredAt: new Date().toISOString(),
          correlationId:
            typeof request.headers['x-correlation-id'] === 'string'
              ? request.headers['x-correlation-id']
              : null,
        };
        await this.audits.append(log);
        return result;
      }),
    );
  }
  private readId(value: unknown) {
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
      ? value.id
      : null;
  }
  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }
}

const requestMethod = (context: ExecutionContext): string =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().method;
