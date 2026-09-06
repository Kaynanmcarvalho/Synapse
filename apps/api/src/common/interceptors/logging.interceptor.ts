import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import type { ObservedRequest } from '../observability/request-context';
import { httpMetrics } from '../observability/http-metrics';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & Partial<ObservedRequest>>();
    const response = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();

    const write = (level: 'log' | 'error', status: number, cause?: unknown) => {
      const durationMs = Date.now() - startedAt;
      const route = request.route?.path ? String(request.route.path) : request.path;
      httpMetrics.record(request.method, route, status, durationMs);
      const entry = JSON.stringify({
        level: level === 'error' ? 'ERROR' : 'INFO',
        event: 'http_request',
        method: request.method,
        route,
        status,
        durationMs,
        requestId: request.requestId,
        correlationId: request.correlationId,
        traceparent: request.traceparent,
        timestamp: new Date().toISOString(),
        ...(cause instanceof Error ? { error: cause.name } : {}),
      });
      this.logger[level](entry);
    };

    return next.handle().pipe(
      tap(() => write('log', response.statusCode)),
      catchError((error: unknown) => {
        const status =
          typeof error === 'object' && error !== null && 'getStatus' in error
            ? (error as { getStatus(): number }).getStatus()
            : 500;
        write('error', status, error);
        return throwError(() => error);
      }),
    );
  }
}
