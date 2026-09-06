import { Injectable } from '@nestjs/common';

export interface HealthReport {
  readonly status: 'ok';
  readonly service: string;
  readonly version: string;
  readonly uptimeSeconds: number;
  readonly timestamp: string;
}

@Injectable()
export class HealthService {
  check(): HealthReport {
    return {
      status: 'ok',
      service: 'synapse-api',
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
