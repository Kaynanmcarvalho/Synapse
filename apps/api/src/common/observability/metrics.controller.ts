import { Controller, Get, Header } from '@nestjs/common';
import { RequirePermission } from '../../modules/iam/iam.decorators';
import { httpMetrics } from './http-metrics';

@Controller('metrics')
export class MetricsController {
  @Get()
  @RequirePermission('auditoria.visualizar')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  metrics(): string {
    return httpMetrics.prometheus();
  }
}
