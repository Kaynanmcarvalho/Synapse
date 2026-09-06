import { Module } from '@nestjs/common';
import { SaasController } from './saas.controller';
import { SaasRepository } from './saas.repository';
import { SaasService } from './saas.service';

@Module({ controllers: [SaasController], providers: [SaasRepository, SaasService] })
export class SaasModule {}
