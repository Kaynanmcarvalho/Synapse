import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { LotController } from './controllers/lot.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { LotRepository } from './repositories/lot.repository';
import { InventoryService } from './services/inventory.service';
import { LotService } from './services/lot.service';
import { TransferService } from './services/transfer.service';
import { TransferController } from './controllers/lot-transfer.controller';
import { InventoryCountController } from './controllers/inventory-count.controller';
import { InventoryCountLockService } from './services/inventory-count-lock.service';
import { InventoryCountService } from './services/inventory-count.service';

@Module({
  controllers: [InventoryController, TransferController, InventoryCountController, LotController],
  providers: [
    InventoryRepository,
    InventoryCountLockService,
    InventoryService,
    InventoryCountService,
    TransferService,
    LotRepository,
    LotService,
  ],
  exports: [InventoryService, InventoryCountService, TransferService, LotService],
})
export class InventoryModule {}
