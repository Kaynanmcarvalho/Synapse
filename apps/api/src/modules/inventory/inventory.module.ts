import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './services/inventory.service';
import { TransferService } from './services/transfer.service';
import { TransferController } from './controllers/lot-transfer.controller';

@Module({
  controllers: [InventoryController, TransferController],
  providers: [InventoryRepository, InventoryService, TransferService],
  exports: [InventoryService, TransferService],
})
export class InventoryModule {}
