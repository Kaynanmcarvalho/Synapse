import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SuggestionPurchaseController } from './controllers/suggestion-purchase.controller';
import { SuggestionPurchaseService } from './services/suggestion-purchase.service';
import { CatalogModule } from '../catalog/catalog.module';
import { FinanceModule } from '../finance/finance.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { ReceivingController } from './controllers/receiving.controller';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { ReceivingRepository } from './repositories/receiving.repository';
import { NfeXmlParserService } from './services/nfe-xml-parser.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { ReceivingService } from './services/receiving.service';

@Module({
  imports: [CatalogModule, InventoryModule, FinanceModule, AnalyticsModule],
  controllers: [PurchaseOrderController, ReceivingController, SuggestionPurchaseController],
  providers: [
    SuggestionPurchaseService,
    PurchaseOrderRepository,
    ReceivingRepository,
    PurchaseOrderService,
    ReceivingService,
    NfeXmlParserService,
  ],
  exports: [PurchaseOrderService, ReceivingService],
})
export class PurchasingModule {}
