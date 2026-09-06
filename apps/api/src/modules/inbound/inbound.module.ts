import { Module } from '@nestjs/common';
import { FiscalModule } from '../fiscal/fiscal.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DfeController } from './controllers/dfe.controller';
import { DfeRepository } from './repositories/dfe.repository';
import { DfeService } from './services/dfe.service';

@Module({
  imports: [FiscalModule, InventoryModule],
  controllers: [DfeController],
  providers: [DfeRepository, DfeService],
  exports: [DfeService],
})
export class InboundModule {}
