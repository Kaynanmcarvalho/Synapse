import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { FinanceModule } from '../finance/finance.module';
import { FieldSalesModule } from '../field-sales/field-sales.module';
import { IamModule } from '../iam/iam.module';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { CatalogModule } from '../catalog/catalog.module';
import { StockIntelligenceController } from './controllers/stock-intelligence.controller';
import { RecalculateStockIntelligenceJob } from './jobs/recalculate-stock-intelligence.job';
import { StockIntelligenceRepository } from './repositories/stock-intelligence.repository';
import { StockIntelligenceService } from './services/stock-intelligence.service';

@Module({
  imports: [CatalogModule, SalesModule, FinanceModule, FieldSalesModule, IamModule],
  controllers: [StockIntelligenceController, DashboardController],
  providers: [
    DashboardService,
    StockIntelligenceRepository,
    StockIntelligenceService,
    RecalculateStockIntelligenceJob,
  ],
  exports: [StockIntelligenceService, StockIntelligenceRepository],
})
export class AnalyticsModule {}
