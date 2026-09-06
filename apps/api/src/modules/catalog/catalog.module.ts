import { Module } from '@nestjs/common';
import { CategoryController } from './controllers/category.controller';
import { PartnerController } from './controllers/partner.controller';
import { PricingController } from './controllers/pricing.controller';
import { ProductController } from './controllers/product.controller';
import { CategoryRepository } from './repositories/category.repository';
import { PartnerRepository } from './repositories/partner.repository';
import { PricingRepository } from './repositories/pricing.repository';
import { ProductRepository } from './repositories/product.repository';
import { CategoryService } from './services/category.service';
import { PartnerService } from './services/partner.service';
import { PricingService } from './services/pricing.service';
import { ProductService } from './services/product.service';

@Module({
  controllers: [PartnerController, ProductController, CategoryController, PricingController],
  providers: [
    PartnerRepository,
    PartnerService,
    ProductRepository,
    ProductService,
    CategoryRepository,
    CategoryService,
    PricingRepository,
    PricingService,
  ],
  exports: [PartnerService, ProductService, PricingService, ProductRepository, PartnerRepository],
})
export class CatalogModule {}
