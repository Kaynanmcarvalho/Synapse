import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditController } from './controllers/audit.controller';
import { MutationAuditInterceptor } from './interceptors/mutation-audit.interceptor';
import { AuditRepository } from './repositories/audit.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditRepository, { provide: APP_INTERCEPTOR, useClass: MutationAuditInterceptor }],
  exports: [AuditRepository],
})
export class AuditModule {}
