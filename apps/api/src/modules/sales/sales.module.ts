import { Module } from '@nestjs/common';
import { CadastrosBaseModule } from '../cadastros/cadastros-base.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PosController } from './controllers/pos.controller';
import { CashSessionRepository } from './repositories/cash-session.repository';
import { PosService } from './services/pos.service';
import { VendaDoPdvService } from './services/venda-do-pdv.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { FiscalModule } from '../fiscal/fiscal.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OfflineSyncController } from './controllers/offline-sync.controller';
import { OfflineSyncService } from './services/offline-sync.service';

@Module({
  imports: [FiscalModule, CatalogModule, InventoryModule, CadastrosBaseModule],
  controllers: [PosController, OrderController, OfflineSyncController],
  providers: [
    CashSessionRepository,
    PosService,
    VendaDoPdvService,
    OrderRepository,
    OrderService,
    OfflineSyncService,
  ],
  exports: [OrderService, OrderRepository, CashSessionRepository],
})
export class SalesModule {}
