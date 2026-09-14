import { Module } from '@nestjs/common';
import { CategoryController } from './controllers/category.controller';
import { ClienteController } from './controllers/cliente.controller';
import { PartnerController } from './controllers/partner.controller';
import { PricingController } from './controllers/pricing.controller';
import { ProductController } from './controllers/product.controller';
import { CategoryRepository } from './repositories/category.repository';
import { FornecedorRepository } from './repositories/fornecedor.repository';
import { ClienteRepository } from './repositories/cliente.repository';
import { PartnerRepository } from './repositories/partner.repository';
import { PricingRepository } from './repositories/pricing.repository';
import { ProductRepository } from './repositories/product.repository';
import { CategoryService } from './services/category.service';
import { ClienteService } from './services/cliente.service';
import { PartnerService } from './services/partner.service';
import { PricingService } from './services/pricing.service';
import { ProductService } from './services/product.service';

@Module({
  controllers: [
    ClienteController,
    PartnerController,
    ProductController,
    CategoryController,
    PricingController,
  ],
  providers: [
    ClienteRepository,
    ClienteService,
    PartnerRepository,
    FornecedorRepository,
    PartnerService,
    ProductRepository,
    ProductService,
    CategoryRepository,
    CategoryService,
    PricingRepository,
    PricingService,
  ],
  exports: [
    ClienteService,
    ClienteRepository,
    PartnerService,
    ProductService,
    PricingService,
    ProductRepository,
    PartnerRepository,
    FornecedorRepository,
  ],
})
export class CatalogModule {}
