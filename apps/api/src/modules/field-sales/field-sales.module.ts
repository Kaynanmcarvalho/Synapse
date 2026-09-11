import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { SalesModule } from '../sales/sales.module';
import { SellerAdminController, SellerSelfController } from './controllers/seller.controller';
import { SellerRepository } from './repositories/seller.repository';
import { SellerDashboardService } from './services/seller-dashboard.service';
import { SellerService } from './services/seller.service';

@Module({
  imports: [CatalogModule, SalesModule],
  controllers: [SellerSelfController, SellerAdminController],
  providers: [SellerRepository, SellerService, SellerDashboardService],
  exports: [SellerService, SellerDashboardService, SellerRepository],
})
export class FieldSalesModule {}
