import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ObservedRequest } from '../observability/request-context';

interface ErrorBody {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
  readonly path: string;
  readonly timestamp: string;
  readonly requestId: string;
  readonly correlationId: string;
}

/** Toda resposta de erro sai no mesmo formato: statusCode, error, message. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & Partial<ObservedRequest>>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? this.extractMessage(exception)
        : 'Erro interno do servidor';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        JSON.stringify({
          level: 'ERROR',
          event: 'unhandled_error',
          method: request.method,
          path: request.url,
          status,
          requestId: request.requestId,
          correlationId: request.correlationId,
          timestamp: new Date().toISOString(),
        }),
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode: status,
      error: HttpStatus[status] ?? 'ERROR',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId ?? 'unknown',
      correlationId: request.correlationId ?? request.requestId ?? 'unknown',
    };

    response.status(status).json(body);
  }

  private extractMessage(exception: HttpException): string {
    const payload = exception.getResponse();
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const raw = (payload as { message: unknown }).message;
      return Array.isArray(raw) ? raw.join('; ') : String(raw);
    }
    return exception.message;
  }
}
