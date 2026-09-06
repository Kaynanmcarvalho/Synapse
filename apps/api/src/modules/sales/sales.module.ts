import { Module } from '@nestjs/common';
import { PosController } from './controllers/pos.controller';
import { CashSessionRepository } from './repositories/cash-session.repository';
import { PosService } from './services/pos.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { FiscalModule } from '../fiscal/fiscal.module';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OfflineSyncController } from './controllers/offline-sync.controller';
import { OfflineSyncService } from './services/offline-sync.service';

@Module({
  imports: [FiscalModule, CatalogModule, InventoryModule],
  controllers: [PosController, OrderController, OfflineSyncController],
  providers: [CashSessionRepository, PosService, OrderRepository, OrderService, OfflineSyncService],
  exports: [OrderService],
})
export class SalesModule {}
