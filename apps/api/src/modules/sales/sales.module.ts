import { Module } from '@nestjs/common';
import { PosController } from './controllers/pos.controller';
import { CashSessionRepository } from './repositories/cash-session.repository';
import { PosService } from './services/pos.service';

@Module({ controllers: [PosController], providers: [CashSessionRepository, PosService] })
export class SalesModule {}
