import { Module } from '@nestjs/common';
import { PartnerController } from './controllers/partner.controller';
import { PartnerRepository } from './repositories/partner.repository';
import { PartnerService } from './services/partner.service';

@Module({
  controllers: [PartnerController],
  providers: [PartnerRepository, PartnerService],
  exports: [PartnerService],
})
export class CatalogModule {}
