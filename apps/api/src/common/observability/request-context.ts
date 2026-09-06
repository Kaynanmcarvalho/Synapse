import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface ObservedRequest extends Request {
  requestId: string;
  correlationId: string;
  traceparent?: string;
}

const header = (request: Request, name: string): string | undefined => {
  const value = request.headers[name];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;
};

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const observed = request as ObservedRequest;
  observed.requestId = header(request, 'x-request-id') ?? randomUUID();
  observed.correlationId = header(request, 'x-correlation-id') ?? observed.requestId;
  observed.traceparent = header(request, 'traceparent');
  response.setHeader('X-Request-ID', observed.requestId);
  response.setHeader('X-Correlation-ID', observed.correlationId);
  next();
}
