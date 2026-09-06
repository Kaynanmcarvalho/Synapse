import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './services/inventory.service';
import { TransferService } from './services/transfer.service';
import { TransferController } from './controllers/lot-transfer.controller';
import { InventoryCountController } from './controllers/inventory-count.controller';
import { InventoryCountLockService } from './services/inventory-count-lock.service';
import { InventoryCountService } from './services/inventory-count.service';

@Module({
  controllers: [InventoryController, TransferController, InventoryCountController],
  providers: [
    InventoryRepository,
    InventoryCountLockService,
    InventoryService,
    InventoryCountService,
    TransferService,
  ],
  exports: [InventoryService, InventoryCountService, TransferService],
})
export class InventoryModule {}
