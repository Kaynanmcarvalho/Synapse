import { FieldSalesModule } from '../field-sales/field-sales.module';
import { IamModule } from '../iam/iam.module';
import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { FinanceModule } from '../finance/finance.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { SalesModule } from '../sales/sales.module';
import { SavedFilterController } from './controllers/saved-filter.controller';
import { SearchController } from './controllers/search.controller';
import { SavedFilterRepository } from './repositories/saved-filter.repository';
import { SavedFilterService } from './services/saved-filter.service';
import { SearchService } from './services/search.service';

@Module({
  imports: [CatalogModule, SalesModule, FiscalModule, FinanceModule, FieldSalesModule, IamModule],
  controllers: [SearchController, SavedFilterController],
  providers: [SearchService, SavedFilterRepository, SavedFilterService],
  exports: [SearchService],
})
export class SearchModule {}
