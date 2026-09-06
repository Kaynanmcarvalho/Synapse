import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FeatureInterceptor } from './feature.interceptor';
import { FeatureRepository } from './feature.repository';
import { FeatureService } from './feature.service';
import { SaasController } from './saas.controller';
import { SaasRepository } from './saas.repository';
import { SaasService } from './saas.service';

@Module({
  controllers: [SaasController],
  providers: [
    SaasRepository,
    SaasService,
    FeatureRepository,
    FeatureService,
    { provide: APP_INTERCEPTOR, useClass: FeatureInterceptor },
  ],
  exports: [FeatureService],
})
export class SaasModule {}
