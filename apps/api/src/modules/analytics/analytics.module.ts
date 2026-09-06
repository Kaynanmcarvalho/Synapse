import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { StockIntelligenceController } from './controllers/stock-intelligence.controller';
import { RecalculateStockIntelligenceJob } from './jobs/recalculate-stock-intelligence.job';
import { StockIntelligenceRepository } from './repositories/stock-intelligence.repository';
import { StockIntelligenceService } from './services/stock-intelligence.service';

@Module({
  imports: [CatalogModule],
  controllers: [StockIntelligenceController],
  providers: [
    StockIntelligenceRepository,
    StockIntelligenceService,
    RecalculateStockIntelligenceJob,
  ],
  exports: [StockIntelligenceService],
})
export class AnalyticsModule {}
