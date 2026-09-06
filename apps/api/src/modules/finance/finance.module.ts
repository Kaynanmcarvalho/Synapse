import { Module } from '@nestjs/common';
import { TituloRepository } from './repositories/titulo.repository';
import { TituloService } from './services/titulo.service';

@Module({
  providers: [TituloRepository, TituloService],
  exports: [TituloService],
})
export class FinanceModule {}
